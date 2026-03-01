import { strict as assert } from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';

import { describe, it, beforeEach, afterEach } from 'vitest';

import { AgentRuntime } from '../src/AgentRuntime.ts';
import type { AgentControllerHost } from '../src/AgentRuntime.ts';
import { AgentNotFoundError } from '../src/errors.ts';
import { FileAgentStore } from '../src/FileAgentStore.ts';

describe('core/agent-runtime/test/AgentRuntime.test.ts', () => {
  const dataDir = path.join(import.meta.dirname, '.agent-runtime-test-data');
  let runtime: AgentRuntime;
  let store: FileAgentStore;
  let host: AgentControllerHost;

  beforeEach(async () => {
    store = new FileAgentStore({ dataDir });
    await store.init();
    host = {
      async *execRun(input: any) {
        const messages = input.input.messages;
        yield {
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: `Hello ${messages.length} messages` }],
          },
        };
        yield {
          type: 'result',
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        };
      },
    } as any;
    runtime = new AgentRuntime({
      host,
      store,
      logger: {
        error() {
          /* noop */
        },
      },
    });
  });

  afterEach(async () => {
    await runtime.destroy();
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  describe('createThread', () => {
    it('should create a thread and return OpenAI ThreadObject', async () => {
      const result = await runtime.createThread();
      assert(result.id.startsWith('thread_'));
      assert.equal(result.object, 'thread');
      assert(typeof result.created_at === 'number');
      // Unix seconds
      assert(result.created_at <= Math.floor(Date.now() / 1000));
      assert(typeof result.metadata === 'object');
    });
  });

  describe('getThread', () => {
    it('should get a thread by id', async () => {
      const created = await runtime.createThread();

      const result = await runtime.getThread(created.id);
      assert.equal(result.id, created.id);
      assert.equal(result.object, 'thread');
      assert(Array.isArray(result.messages));
    });

    it('should throw AgentNotFoundError for non-existent thread', async () => {
      await assert.rejects(
        () => runtime.getThread('thread_xxx'),
        (err: unknown) => {
          assert(err instanceof AgentNotFoundError);
          assert.equal(err.status, 404);
          return true;
        },
      );
    });
  });

  describe('syncRun', () => {
    it('should collect all chunks and return completed RunObject', async () => {
      const result = await runtime.syncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      } as any);
      assert(result.id.startsWith('run_'));
      assert.equal(result.object, 'thread.run');
      assert.equal(result.status, 'completed');
      assert(result.thread_id);
      assert(result.thread_id.startsWith('thread_'));
      assert.equal(result.output!.length, 1);
      assert.equal(result.output![0].object, 'thread.message');
      assert.equal(result.output![0].role, 'assistant');
      assert.equal(result.output![0].status, 'completed');
      assert.equal(result.output![0].content[0].type, 'text');
      assert.equal(result.output![0].content[0].text.value, 'Hello 1 messages');
      assert(Array.isArray(result.output![0].content[0].text.annotations));
      assert.equal(result.usage!.prompt_tokens, 10);
      assert.equal(result.usage!.completion_tokens, 5);
      assert.equal(result.usage!.total_tokens, 15);
      assert(result.started_at! >= result.created_at, 'started_at should be >= created_at');
    });

    it('should pass metadata through to store and return it', async () => {
      const meta = { user_id: 'u_1', trace: 'xyz' };
      const result = await runtime.syncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
        metadata: meta,
      } as any);
      assert.deepEqual(result.metadata, meta);

      // Verify stored in store
      const run = await store.getRun(result.id);
      assert.deepEqual(run.metadata, meta);
    });

    it('should store the run in the store', async () => {
      const result = await runtime.syncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      } as any);
      const run = await store.getRun(result.id);
      assert.equal(run.status, 'completed');
      assert(run.completed_at);
    });

    it('should append messages to thread when thread_id provided', async () => {
      const thread = await runtime.createThread();

      await runtime.syncRun({
        thread_id: thread.id,
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      } as any);

      const updated = await runtime.getThread(thread.id);
      assert.equal(updated.messages.length, 2); // user + assistant
      assert.equal(updated.messages[0].role, 'user');
      assert.equal(updated.messages[1].role, 'assistant');
    });

    it('should auto-create thread and append messages when thread_id not provided', async () => {
      const result = await runtime.syncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      } as any);
      assert(result.thread_id);
      assert(result.thread_id.startsWith('thread_'));

      // Verify thread was created and messages were appended
      const thread = await runtime.getThread(result.thread_id);
      assert.equal(thread.messages.length, 2); // user + assistant
      assert.equal(thread.messages[0].role, 'user');
      assert.equal(thread.messages[1].role, 'assistant');
    });
  });

  describe('asyncRun', () => {
    it('should return queued status immediately with auto-created thread_id', async () => {
      const result = await runtime.asyncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      } as any);
      assert(result.id.startsWith('run_'));
      assert.equal(result.object, 'thread.run');
      assert.equal(result.status, 'queued');
      assert(result.thread_id);
      assert(result.thread_id.startsWith('thread_'));
    });

    it('should complete the run in the background', async () => {
      const result = await runtime.asyncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      } as any);

      // Wait for background task to complete naturally
      await runtime.waitForPendingTasks();

      const run = await store.getRun(result.id);
      assert.equal(run.status, 'completed');
      assert.equal(run.output![0].content[0].text.value, 'Hello 1 messages');
    });

    it('should auto-create thread and append messages when thread_id not provided', async () => {
      const result = await runtime.asyncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      } as any);
      assert(result.thread_id);

      // Wait for background task to complete naturally
      await runtime.waitForPendingTasks();

      // Verify thread was created and messages were appended
      const thread = await store.getThread(result.thread_id);
      assert.equal(thread.messages.length, 2); // user + assistant
      assert.equal(thread.messages[0].role, 'user');
      assert.equal(thread.messages[1].role, 'assistant');
    });

    it('should pass metadata through to store and return it', async () => {
      const meta = { session: 'sess_1' };
      const result = await runtime.asyncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
        metadata: meta,
      } as any);
      assert.deepEqual(result.metadata, meta);

      // Wait for background task to complete naturally
      await runtime.waitForPendingTasks();

      // Verify stored in store
      const run = await store.getRun(result.id);
      assert.deepEqual(run.metadata, meta);
    });
  });

  describe('getRun', () => {
    it('should get a run by id', async () => {
      const syncResult = await runtime.syncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      } as any);

      const result = await runtime.getRun(syncResult.id);
      assert.equal(result.id, syncResult.id);
      assert.equal(result.object, 'thread.run');
      assert.equal(result.status, 'completed');
      assert(typeof result.created_at === 'number');
    });

    it('should return metadata from getRun', async () => {
      const meta = { source: 'api' };
      const syncResult = await runtime.syncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
        metadata: meta,
      } as any);

      const result = await runtime.getRun(syncResult.id);
      assert.deepEqual(result.metadata, meta);
    });
  });

  describe('cancelRun', () => {
    it('should cancel a run', async () => {
      // Use a signal-aware execRun so abort takes effect
      host.execRun = async function* (_input: any, signal?: AbortSignal) {
        yield {
          type: 'assistant',
          message: { role: 'assistant' as const, content: [{ type: 'text' as const, text: 'start' }] },
        };
        // Wait but check abort signal
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, 5000);
          if (signal) {
            signal.addEventListener(
              'abort',
              () => {
                clearTimeout(timer);
                reject(new Error('aborted'));
              },
              { once: true },
            );
          }
        });
        yield {
          type: 'assistant',
          message: { role: 'assistant' as const, content: [{ type: 'text' as const, text: 'end' }] },
        };
      } as any;

      const result = await runtime.asyncRun({
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      } as any);

      // Let background task start running
      await new Promise((resolve) => setTimeout(resolve, 50));

      const cancelResult = await runtime.cancelRun(result.id);
      assert.equal(cancelResult.id, result.id);
      assert.equal(cancelResult.object, 'thread.run');
      assert.equal(cancelResult.status, 'cancelled');

      const run = await store.getRun(result.id);
      assert.equal(run.status, 'cancelled');
      assert(run.cancelled_at);
    });
  });
});
