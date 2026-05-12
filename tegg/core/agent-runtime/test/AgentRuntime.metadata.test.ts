import assert from 'node:assert/strict';

import { AgentObjectType, AgentSSEEvent, MessageRole, RunStatus } from '@eggjs/tegg-types/agent-runtime';
import type { AgentStreamMessage, CreateRunInput, RunObject } from '@eggjs/tegg-types/agent-runtime';
import { describe, it, beforeEach, afterEach } from 'vitest';

import { AgentRuntime } from '../src/AgentRuntime.ts';
import type { AgentExecutor, AgentRuntimeOptions } from '../src/AgentRuntime.ts';
import { OSSAgentStore } from '../src/OSSAgentStore.ts';
import type { SSEWriter } from '../src/SSEWriter.ts';
import { MapStorageClient } from './helpers.ts';

class MockSSEWriter implements SSEWriter {
  events: Array<{ event: string; data: unknown }> = [];
  closed = false;

  writeEvent(event: string, data: unknown): void {
    this.events.push({ event, data });
  }

  end(): void {
    this.closed = true;
  }

  onClose(): void {
    /* noop */
  }
}

describe('test/AgentRuntime.metadata.test.ts', () => {
  let runtime: AgentRuntime;
  let store: OSSAgentStore;
  let executor: AgentExecutor;

  beforeEach(() => {
    store = new OSSAgentStore({ client: new MapStorageClient() });
    executor = {
      async *execRun(input: CreateRunInput): AsyncGenerator<AgentStreamMessage> {
        const messages = input.input.messages;
        yield {
          message: {
            role: MessageRole.Assistant,
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
      assert.deepEqual(result.metadata, meta);

      const stored = await store.getThread(result.id);
      assert.deepEqual(stored.metadata, meta);
    });

    it('should default to empty metadata when not provided', async () => {
      const result = await runtime.createThread();
      assert.deepEqual(result.metadata, {});
    });
  });

  describe('syncRun metadata handling', () => {
    it('should keep input.metadata on the run and not copy it to an auto-created thread', async () => {
      const meta = { agentName: 'bar', sandboxId: 's-42' };
      const result = await runtime.syncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
        metadata: meta,
      });

      // Run metadata is preserved (existing behaviour)
      assert.deepEqual(result.metadata, meta);
      assert.equal(result.status, RunStatus.Completed);

      const thread = await store.getThread(result.threadId);
      assert.deepEqual(thread.metadata, {});
    });

    it('should NOT overwrite metadata of an existing thread (resume path)', async () => {
      // Pre-create a thread with original metadata
      const original = { agentName: 'orig', createdBy: 'user-1' };
      const thread = await runtime.createThread({ metadata: original });

      // Run with conflicting metadata while reusing the existing threadId
      const result = await runtime.syncRun({
        threadId: thread.id,
        input: { messages: [{ role: 'user', content: 'Hi' }] },
        metadata: { agentName: 'OVERRIDE' },
      });

      assert.equal(result.threadId, thread.id);

      // Thread metadata must remain the original — resume must not mutate it.
      const stored = await store.getThread(thread.id);
      assert.deepEqual(stored.metadata, original);
    });
  });

  describe('asyncRun metadata handling', () => {
    it('should keep input.metadata on the run and not copy it to an auto-created thread', async () => {
      const meta = { agentName: 'baz' };
      const result = await runtime.asyncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
        metadata: meta,
      });
      await runtime.waitForPendingTasks();

      assert.deepEqual(result.metadata, meta);
      const thread = await store.getThread(result.threadId);
      assert.deepEqual(thread.metadata, {});
    });
  });

  describe('streamRun metadata handling', () => {
    it('should keep input.metadata on the run and not copy it to an auto-created thread', async () => {
      const meta = { agentName: 'stream', source: 'sse' };
      const writer = new MockSSEWriter();

      await runtime.streamRun(
        {
          input: { messages: [{ role: 'user', content: 'Hi' }] },
          metadata: meta,
        },
        writer,
      );

      const runCreatedEvent = writer.events.find((e) => e.event === AgentSSEEvent.ThreadRunCreated);
      const run = runCreatedEvent!.data as RunObject;

      assert.deepEqual(run.metadata, meta);
      const thread = await store.getThread(run.threadId);
      assert.deepEqual(thread.metadata, {});
    });
  });
});
