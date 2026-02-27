import { strict as assert } from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';

import { describe, it, beforeEach, afterEach } from 'vitest';

import { AGENT_DEFAULT_FACTORIES } from '../src/agentDefaults.ts';
import { FileAgentStore } from '../src/FileAgentStore.ts';

describe('core/agent-runtime/test/agentDefaults.test.ts', () => {
  const dataDir = path.join(import.meta.dirname, '.agent-defaults-test-data');
  let mockInstance: any;

  beforeEach(async () => {
    const store = new FileAgentStore({ dataDir });
    await store.init();
    mockInstance = {
      __agentStore: store,
      __runningTasks: new Map(),
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
    };
  });

  afterEach(async () => {
    // Wait for any in-flight tasks
    if (mockInstance.__runningTasks.size) {
      const pending = Array.from(mockInstance.__runningTasks.values()).map((t: any) => t.promise);
      await Promise.allSettled(pending);
    }
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  describe('createThread', () => {
    it('should create a thread and return OpenAI ThreadObject', async () => {
      const fn = AGENT_DEFAULT_FACTORIES.createThread();
      const result = await fn.call(mockInstance);
      assert(result.id.startsWith('thread_'));
      assert.equal(result.object, 'thread');
      assert(typeof result.created_at === 'number');
      // Unix seconds — should be much smaller than Date.now()
      assert(result.created_at < Date.now());
      assert(typeof result.metadata === 'object');
    });
  });

  describe('getThread', () => {
    it('should get a thread by id', async () => {
      const createFn = AGENT_DEFAULT_FACTORIES.createThread();
      const created = await createFn.call(mockInstance);

      const getFn = AGENT_DEFAULT_FACTORIES.getThread();
      const result = await getFn.call(mockInstance, created.id);
      assert.equal(result.id, created.id);
      assert.equal(result.object, 'thread');
      assert(Array.isArray(result.messages));
    });

    it('should throw for non-existent thread', async () => {
      const getFn = AGENT_DEFAULT_FACTORIES.getThread();
      await assert.rejects(() => getFn.call(mockInstance, 'thread_xxx'), /Thread thread_xxx not found/);
    });
  });

  describe('syncRun', () => {
    it('should collect all chunks and return completed RunObject', async () => {
      const fn = AGENT_DEFAULT_FACTORIES.syncRun();
      const result = await fn.call(mockInstance, {
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });
      assert(result.id.startsWith('run_'));
      assert.equal(result.object, 'thread.run');
      assert.equal(result.status, 'completed');
      assert(result.thread_id);
      assert(result.thread_id.startsWith('thread_'));
      assert.equal(result.output.length, 1);
      assert.equal(result.output[0].object, 'thread.message');
      assert.equal(result.output[0].role, 'assistant');
      assert.equal(result.output[0].status, 'completed');
      assert.equal(result.output[0].content[0].type, 'text');
      assert.equal(result.output[0].content[0].text.value, 'Hello 1 messages');
      assert(Array.isArray(result.output[0].content[0].text.annotations));
      assert.equal(result.usage.prompt_tokens, 10);
      assert.equal(result.usage.completion_tokens, 5);
      assert.equal(result.usage.total_tokens, 15);
      assert(result.started_at >= result.created_at, 'started_at should be >= created_at');
    });

    it('should pass metadata through to store and return it', async () => {
      const fn = AGENT_DEFAULT_FACTORIES.syncRun();
      const meta = { user_id: 'u_1', trace: 'xyz' };
      const result = await fn.call(mockInstance, {
        input: { messages: [{ role: 'user', content: 'Hi' }] },
        metadata: meta,
      });
      assert.deepEqual(result.metadata, meta);

      // Verify stored in store
      const run = await mockInstance.__agentStore.getRun(result.id);
      assert.deepEqual(run.metadata, meta);
    });

    it('should store the run in the store', async () => {
      const fn = AGENT_DEFAULT_FACTORIES.syncRun();
      const result = await fn.call(mockInstance, {
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });
      const run = await mockInstance.__agentStore.getRun(result.id);
      assert.equal(run.status, 'completed');
      assert(run.completed_at);
    });

    it('should append messages to thread when thread_id provided', async () => {
      const createFn = AGENT_DEFAULT_FACTORIES.createThread();
      const thread = await createFn.call(mockInstance);

      const fn = AGENT_DEFAULT_FACTORIES.syncRun();
      await fn.call(mockInstance, {
        thread_id: thread.id,
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });

      const getThreadFn = AGENT_DEFAULT_FACTORIES.getThread();
      const updated = await getThreadFn.call(mockInstance, thread.id);
      assert.equal(updated.messages.length, 2); // user + assistant
      assert.equal(updated.messages[0].role, 'user');
      assert.equal(updated.messages[1].role, 'assistant');
    });

    it('should auto-create thread and append messages when thread_id not provided', async () => {
      const fn = AGENT_DEFAULT_FACTORIES.syncRun();
      const result = await fn.call(mockInstance, {
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });
      assert(result.thread_id);
      assert(result.thread_id.startsWith('thread_'));

      // Verify thread was created and messages were appended
      const getThreadFn = AGENT_DEFAULT_FACTORIES.getThread();
      const thread = await getThreadFn.call(mockInstance, result.thread_id);
      assert.equal(thread.messages.length, 2); // user + assistant
      assert.equal(thread.messages[0].role, 'user');
      assert.equal(thread.messages[1].role, 'assistant');
    });
  });

  describe('asyncRun', () => {
    it('should return queued status immediately with auto-created thread_id', async () => {
      const fn = AGENT_DEFAULT_FACTORIES.asyncRun();
      const result = await fn.call(mockInstance, {
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });
      assert(result.id.startsWith('run_'));
      assert.equal(result.object, 'thread.run');
      assert.equal(result.status, 'queued');
      assert(result.thread_id);
      assert(result.thread_id.startsWith('thread_'));
    });

    it('should complete the run in the background', async () => {
      const fn = AGENT_DEFAULT_FACTORIES.asyncRun();
      const result = await fn.call(mockInstance, {
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });

      // Wait for background task to complete
      const task = mockInstance.__runningTasks.get(result.id);
      assert(task);
      await task.promise;

      const run = await mockInstance.__agentStore.getRun(result.id);
      assert.equal(run.status, 'completed');
      assert.equal(run.output![0].content[0].text.value, 'Hello 1 messages');
    });

    it('should auto-create thread and append messages when thread_id not provided', async () => {
      const fn = AGENT_DEFAULT_FACTORIES.asyncRun();
      const result = await fn.call(mockInstance, {
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });
      assert(result.thread_id);

      // Wait for background task to complete
      const task = mockInstance.__runningTasks.get(result.id);
      assert(task);
      await task.promise;

      // Verify thread was created and messages were appended
      const getThreadFn = AGENT_DEFAULT_FACTORIES.getThread();
      const thread = await getThreadFn.call(mockInstance, result.thread_id);
      assert.equal(thread.messages.length, 2); // user + assistant
      assert.equal(thread.messages[0].role, 'user');
      assert.equal(thread.messages[1].role, 'assistant');
    });

    it('should pass metadata through to store and return it', async () => {
      const fn = AGENT_DEFAULT_FACTORIES.asyncRun();
      const meta = { session: 'sess_1' };
      const result = await fn.call(mockInstance, {
        input: { messages: [{ role: 'user', content: 'Hi' }] },
        metadata: meta,
      });
      assert.deepEqual(result.metadata, meta);

      // Wait for background task to complete
      const task = mockInstance.__runningTasks.get(result.id);
      assert(task);
      await task.promise;

      // Verify stored in store
      const run = await mockInstance.__agentStore.getRun(result.id);
      assert.deepEqual(run.metadata, meta);
    });
  });

  describe('getRun', () => {
    it('should get a run by id', async () => {
      const syncFn = AGENT_DEFAULT_FACTORIES.syncRun();
      const syncResult = await syncFn.call(mockInstance, {
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });

      const getRunFn = AGENT_DEFAULT_FACTORIES.getRun();
      const result = await getRunFn.call(mockInstance, syncResult.id);
      assert.equal(result.id, syncResult.id);
      assert.equal(result.object, 'thread.run');
      assert.equal(result.status, 'completed');
      assert(typeof result.created_at === 'number');
    });

    it('should return metadata from getRun', async () => {
      const syncFn = AGENT_DEFAULT_FACTORIES.syncRun();
      const meta = { source: 'api' };
      const syncResult = await syncFn.call(mockInstance, {
        input: { messages: [{ role: 'user', content: 'Hi' }] },
        metadata: meta,
      });

      const getRunFn = AGENT_DEFAULT_FACTORIES.getRun();
      const result = await getRunFn.call(mockInstance, syncResult.id);
      assert.deepEqual(result.metadata, meta);
    });
  });

  describe('cancelRun', () => {
    it('should cancel a run', async () => {
      const asyncFn = AGENT_DEFAULT_FACTORIES.asyncRun();
      // Use a signal-aware execRun so abort takes effect
      mockInstance.execRun = async function* (_input: any, signal?: AbortSignal) {
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
      };

      const result = await asyncFn.call(mockInstance, {
        input: { messages: [{ role: 'user', content: 'Hi' }] },
      });

      // Let background task start running
      await new Promise((resolve) => setTimeout(resolve, 50));

      const cancelFn = AGENT_DEFAULT_FACTORIES.cancelRun();
      const cancelResult = await cancelFn.call(mockInstance, result.id);
      assert.equal(cancelResult.id, result.id);
      assert.equal(cancelResult.object, 'thread.run');
      assert.equal(cancelResult.status, 'cancelled');

      // Wait for background task to finish
      const task = mockInstance.__runningTasks.get(result.id);
      if (task) {
        await task.promise;
      }

      const run = await mockInstance.__agentStore.getRun(result.id);
      assert.equal(run.status, 'cancelled');
      assert(run.cancelled_at);
    });
  });
});
