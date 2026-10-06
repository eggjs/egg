import assert from 'node:assert';

import type { AgentMessage, CreateRunInput, StreamEvent } from '@eggjs/tegg-types/agent-runtime';
import { AgentObjectType, RunStatus } from '@eggjs/tegg-types/agent-runtime';
import { describe, it, beforeEach, afterEach } from 'vitest';

import { AgentRuntime } from '../src/AgentRuntime.ts';
import type { AgentExecutor, AgentRuntimeOptions } from '../src/AgentRuntime.ts';
import { OSSAgentStore } from '../src/OSSAgentStore.ts';
import type { SSEWriter } from '../src/SSEWriter.ts';
import { MapStorageClient } from './helpers.ts';

class MockSSEWriter implements SSEWriter {
  events: Array<{ event: string; data: unknown }> = [];
  comments: string[] = [];
  closed = false;
  private closeCallbacks: Array<() => void> = [];

  writeEvent(event: string, data: unknown): void {
    this.events.push({ event, data });
  }

  writeComment(text: string): void {
    this.comments.push(text);
  }

  end(): void {
    this.closed = true;
  }

  onClose(callback: () => void): void {
    this.closeCallbacks.push(callback);
  }

  simulateClose(): void {
    this.closed = true;
    for (const cb of this.closeCallbacks) cb();
  }
}

describe('test/AgentRuntime.metadata.test.ts', () => {
  let runtime: AgentRuntime;
  let store: OSSAgentStore;
  let client: MapStorageClient;
  let executor: AgentExecutor;

  beforeEach(() => {
    client = new MapStorageClient();
    store = new OSSAgentStore({ client });
    executor = {
      async *execRun(input: CreateRunInput): AsyncGenerator<AgentMessage> {
        const messages = input.input.messages;
        yield {
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: `Hello ${messages.length} messages` }],
          },
        };
      },
    };
    runtime = new AgentRuntime({
      executor,
      store,
      logger: {
        error() {
          /* noop */
        },
      } as unknown as AgentRuntimeOptions['logger'],
    });
  });

  afterEach(async () => {
    await runtime.destroy();
  });

  describe('createThread', () => {
    it('should accept metadata and persist it on the thread record', async () => {
      const meta = { agentName: 'foo', traceId: 't-1' };
      const result = await runtime.createThread({ metadata: meta });
      assert.equal(result.object, AgentObjectType.Thread);
      assert.deepStrictEqual(result.metadata, meta);

      const stored = await store.getThread(result.id);
      assert.deepStrictEqual(stored.metadata, meta);
    });

    it('should default to empty metadata when not provided', async () => {
      const result = await runtime.createThread();
      assert.deepStrictEqual(result.metadata, {});
    });
  });

  describe('syncRun metadata handling', () => {
    it('should store metadata on the run and initialize an auto-created thread', async () => {
      const metadata = {
        bizId: 'order_123',
        nested: { source: 'customer_service' },
        tags: ['vip', 7],
        enabled: true,
        nullable: null,
      };
      const result = await runtime.syncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
        metadata,
      });

      // The run record keeps the metadata verbatim...
      assert.deepStrictEqual(result.metadata, metadata);
      assert.equal(result.status, RunStatus.Completed);
      // ...and the auto-created thread is initialized with the same metadata.
      const thread = await store.getThread(result.threadId);
      assert.deepStrictEqual(thread.metadata, metadata);
    });

    it('should shallow-merge metadata into an existing thread', async () => {
      const thread = await runtime.createThread({
        metadata: {
          bizId: 'order_123',
          source: 'customer_service',
          nested: { old: true },
        },
      });

      const result = await runtime.syncRun({
        threadId: thread.id,
        input: { messages: [{ role: 'user', content: 'Hi' }] },
        metadata: {
          source: 'operator_console',
          nested: { replacement: true },
        },
      });

      // The run keeps exactly what was passed in...
      assert.deepStrictEqual(result.metadata, {
        source: 'operator_console',
        nested: { replacement: true },
      });
      // ...while the thread metadata is shallow-merged (bizId preserved).
      const stored = await store.getThread(thread.id);
      assert.deepStrictEqual(stored.metadata, {
        bizId: 'order_123',
        source: 'operator_console',
        nested: { replacement: true },
      });
    });

    it('should leave existing thread metadata unchanged when metadata is empty or omitted', async () => {
      const original = { bizId: 'order_123', source: 'customer_service' };
      const thread = await runtime.createThread({ metadata: original });

      await runtime.syncRun({
        threadId: thread.id,
        input: { messages: [{ role: 'user', content: 'First' }] },
        metadata: {},
      });
      await runtime.syncRun({
        threadId: thread.id,
        input: { messages: [{ role: 'user', content: 'Second' }] },
      });

      assert.deepStrictEqual((await store.getThread(thread.id)).metadata, original);
    });

    it('should reject invalid metadata before creating a thread or run', async () => {
      const assertInvalid = async (invalid: unknown): Promise<void> => {
        await assert.rejects(
          () =>
            runtime.syncRun({
              input: { messages: [{ role: 'user', content: 'Hi' }] },
              metadata: invalid,
            } as unknown as CreateRunInput),
          (err: unknown) => {
            assert.equal((err as { status?: number }).status, 400);
            assert.match((err as Error).message, /metadata/);
            return true;
          },
        );
      };

      for (const invalid of [null, [], 'invalid', 1, true]) {
        await assertInvalid(invalid);
      }
      assert.deepStrictEqual(client.keysWithPrefix('threads/'), []);
      assert.deepStrictEqual(client.keysWithPrefix('runs/'), []);
    });

    it('should not fail run creation when persisting metadata onto an existing thread fails', async () => {
      const thread = await runtime.createThread({ metadata: { a: 1 } });
      // Force the thread-side metadata write to fail.
      store.updateThreadMetadata = async () => {
        throw new Error('boom');
      };

      const result = await runtime.syncRun({
        threadId: thread.id,
        input: { messages: [{ role: 'user', content: 'Hi' }] },
        metadata: { b: 2 },
      });

      // The run still completes and keeps its metadata on the run record...
      assert.equal(result.status, RunStatus.Completed);
      assert.deepStrictEqual(result.metadata, { b: 2 });
      // ...while the thread metadata was left untouched by the failed write.
      assert.deepStrictEqual((await store.getThread(thread.id)).metadata, { a: 1 });
    });
  });

  describe('asyncRun metadata handling', () => {
    it('should store metadata on the run and persist it on the thread', async () => {
      const metadata = { bizId: 'async_123' };
      const result = await runtime.asyncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
        metadata,
      });
      await runtime.waitForPendingTasks();

      assert.deepStrictEqual(result.metadata, metadata);
      const thread = await store.getThread(result.threadId);
      assert.deepStrictEqual(thread.metadata, metadata);
    });
  });

  describe('streamRun metadata handling', () => {
    it('should store metadata on the run and persist it on the thread', async () => {
      const meta = { agentName: 'stream', source: 'sse' };
      const writer = new MockSSEWriter();

      await runtime.streamRun(
        {
          input: { messages: [{ role: 'user', content: 'Hi' }] },
          metadata: meta,
        },
        writer,
      );

      const runCreatedEvent = writer.events.find((e) => e.event === 'run_created')!.data as StreamEvent;
      const runId = (runCreatedEvent.data as { runId: string }).runId;
      const threadId = (runCreatedEvent.data as { threadId: string }).threadId;

      const run = await store.getRun(runId);
      assert.deepStrictEqual(run.metadata, meta);
      assert.deepStrictEqual((await store.getThread(threadId)).metadata, meta);
    });
  });
});
