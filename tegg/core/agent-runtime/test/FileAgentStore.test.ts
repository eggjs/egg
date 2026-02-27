import { strict as assert } from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';

import { describe, it, beforeEach, afterEach } from 'vitest';

import { AgentNotFoundError } from '../src/errors.ts';
import { FileAgentStore } from '../src/FileAgentStore.ts';

describe('core/agent-runtime/test/FileAgentStore.test.ts', () => {
  const dataDir = path.join(import.meta.dirname, '.agent-test-data');
  let store: FileAgentStore;

  beforeEach(async () => {
    store = new FileAgentStore({ dataDir });
    await store.init();
  });

  afterEach(async () => {
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  describe('threads', () => {
    it('should create a thread', async () => {
      const thread = await store.createThread();
      assert(thread.id.startsWith('thread_'));
      assert.equal(thread.object, 'thread');
      assert(Array.isArray(thread.messages));
      assert.equal(thread.messages.length, 0);
      assert(typeof thread.created_at === 'number');
      // Unix seconds — should be much smaller than Date.now()
      assert(thread.created_at < Date.now());
    });

    it('should create a thread with metadata', async () => {
      const thread = await store.createThread({ key: 'value' });
      assert.deepEqual(thread.metadata, { key: 'value' });
    });

    it('should create a thread with empty metadata by default', async () => {
      const thread = await store.createThread();
      assert.deepEqual(thread.metadata, {});
    });

    it('should get a thread by id', async () => {
      const created = await store.createThread();
      const fetched = await store.getThread(created.id);
      assert.equal(fetched.id, created.id);
      assert.equal(fetched.object, 'thread');
      assert.equal(fetched.created_at, created.created_at);
    });

    it('should throw AgentNotFoundError for non-existent thread', async () => {
      await assert.rejects(
        () => store.getThread('thread_non_existent'),
        (err: unknown) => {
          assert(err instanceof AgentNotFoundError);
          assert.equal(err.status, 404);
          assert.match(err.message, /Thread thread_non_existent not found/);
          return true;
        },
      );
    });

    it('should append messages to a thread', async () => {
      const thread = await store.createThread();
      await store.appendMessages(thread.id, [
        {
          id: 'msg_1',
          object: 'thread.message',
          created_at: Math.floor(Date.now() / 1000),
          role: 'user',
          status: 'completed',
          content: [{ type: 'text', text: { value: 'Hello', annotations: [] } }],
        },
        {
          id: 'msg_2',
          object: 'thread.message',
          created_at: Math.floor(Date.now() / 1000),
          role: 'assistant',
          status: 'completed',
          content: [{ type: 'text', text: { value: 'Hi!', annotations: [] } }],
        },
      ]);
      const fetched = await store.getThread(thread.id);
      assert.equal(fetched.messages.length, 2);
      assert.equal(fetched.messages[0].content[0].text.value, 'Hello');
      assert.equal(fetched.messages[1].content[0].text.value, 'Hi!');
    });
  });

  describe('runs', () => {
    it('should create a run', async () => {
      const run = await store.createRun([{ role: 'user', content: 'Hello' }]);
      assert(run.id.startsWith('run_'));
      assert.equal(run.object, 'thread.run');
      assert.equal(run.status, 'queued');
      assert.equal(run.input.length, 1);
      assert(typeof run.created_at === 'number');
      // Unix seconds
      assert(run.created_at < Date.now());
    });

    it('should create a run with thread_id and config', async () => {
      const run = await store.createRun([{ role: 'user', content: 'Hello' }], 'thread_123', { timeout_ms: 5000 });
      assert.equal(run.thread_id, 'thread_123');
      assert.deepEqual(run.config, { timeout_ms: 5000 });
    });

    it('should create a run with metadata', async () => {
      const meta = { user_id: 'u_1', session: 'abc' };
      const run = await store.createRun([{ role: 'user', content: 'Hello' }], 'thread_123', undefined, meta);
      assert.deepEqual(run.metadata, meta);

      // Verify metadata persists through getRun
      const fetched = await store.getRun(run.id);
      assert.deepEqual(fetched.metadata, meta);
    });

    it('should preserve metadata across updateRun', async () => {
      const meta = { tag: 'test' };
      const run = await store.createRun([{ role: 'user', content: 'Hello' }], undefined, undefined, meta);
      await store.updateRun(run.id, { status: 'in_progress', started_at: Math.floor(Date.now() / 1000) });
      const fetched = await store.getRun(run.id);
      assert.equal(fetched.status, 'in_progress');
      assert.deepEqual(fetched.metadata, meta);
    });

    it('should get a run by id', async () => {
      const created = await store.createRun([{ role: 'user', content: 'Hello' }]);
      const fetched = await store.getRun(created.id);
      assert.equal(fetched.id, created.id);
      assert.equal(fetched.status, 'queued');
    });

    it('should throw AgentNotFoundError for non-existent run', async () => {
      await assert.rejects(
        () => store.getRun('run_non_existent'),
        (err: unknown) => {
          assert(err instanceof AgentNotFoundError);
          assert.equal(err.status, 404);
          assert.match(err.message, /Run run_non_existent not found/);
          return true;
        },
      );
    });

    it('should update a run', async () => {
      const run = await store.createRun([{ role: 'user', content: 'Hello' }]);
      await store.updateRun(run.id, {
        status: 'completed',
        output: [
          {
            id: 'msg_1',
            object: 'thread.message',
            created_at: Math.floor(Date.now() / 1000),
            role: 'assistant',
            status: 'completed',
            content: [{ type: 'text', text: { value: 'World', annotations: [] } }],
          },
        ],
        completed_at: Math.floor(Date.now() / 1000),
      });
      const fetched = await store.getRun(run.id);
      assert.equal(fetched.status, 'completed');
      assert.equal(fetched.output![0].content[0].text.value, 'World');
      assert(typeof fetched.completed_at === 'number');
    });
  });

  describe('data directory', () => {
    it('should create subdirectories on init', async () => {
      const threadsDir = path.join(dataDir, 'threads');
      const runsDir = path.join(dataDir, 'runs');
      const threadsStat = await fs.stat(threadsDir);
      const runsStat = await fs.stat(runsDir);
      assert(threadsStat.isDirectory());
      assert(runsStat.isDirectory());
    });
  });
});
