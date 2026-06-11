import assert from 'node:assert';

import type { AgentMessage } from '@eggjs/tegg-types/agent-runtime';
import { describe, it, beforeEach } from 'vitest';

import { AgentNotFoundError, OSSAgentStore, reverseMs } from '../src/index.ts';
import { MapStorageClient, MapStorageClientWithoutAppend } from './helpers.ts';

describe('test/OSSAgentStore.test.ts', () => {
  let store: OSSAgentStore;

  beforeEach(() => {
    store = new OSSAgentStore({ client: new MapStorageClient() });
  });

  describe('threads', () => {
    it('should create a thread', async () => {
      const thread = await store.createThread();
      assert(thread.id.startsWith('thread_'));
      assert.equal(thread.object, 'thread');
      assert(Array.isArray(thread.messages));
      assert.equal(thread.messages.length, 0);
      assert(typeof thread.createdAt === 'number');
      assert(thread.createdAt <= Math.floor(Date.now() / 1000));
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
      assert.equal(fetched.createdAt, created.createdAt);
    });

    it('should return empty messages for a new thread', async () => {
      const thread = await store.createThread();
      const fetched = await store.getThread(thread.id);
      assert.deepEqual(fetched.messages, []);
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
      const messages: AgentMessage[] = [
        { type: 'user', message: { role: 'user', content: 'Hello' } },
        { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'Hi!' }] } },
      ];
      await store.appendMessages(thread.id, messages);
      const fetched = await store.getThread(thread.id);
      assert.equal(fetched.messages.length, 2);
      assert.equal(fetched.messages[0].type, 'user');
      assert.equal(fetched.messages[1].type, 'assistant');
    });

    it('should append messages incrementally', async () => {
      const thread = await store.createThread();
      await store.appendMessages(thread.id, [{ type: 'user', message: { role: 'user', content: 'First' } }]);
      await store.appendMessages(thread.id, [
        { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'Second' }] } },
      ]);
      const fetched = await store.getThread(thread.id);
      assert.equal(fetched.messages.length, 2);
      assert.equal(fetched.messages[0].type, 'user');
      assert.equal(fetched.messages[1].type, 'assistant');
    });

    it('should throw AgentNotFoundError when appending to non-existent thread', async () => {
      await assert.rejects(
        () =>
          store.appendMessages('thread_non_existent', [{ type: 'user', message: { role: 'user', content: 'Hello' } }]),
        (err: unknown) => {
          assert(err instanceof AgentNotFoundError);
          return true;
        },
      );
    });

    it('should only return user and assistant messages by default', async () => {
      const thread = await store.createThread();
      await store.appendMessages(thread.id, [
        { type: 'system', subtype: 'init', session_id: 'sess-1' },
        { type: 'user', message: { role: 'user', content: 'Hello' } },
        { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'Hi!' }] } },
        { type: 'result', subtype: 'success', usage: { input_tokens: 10, output_tokens: 5 } },
      ]);
      const fetched = await store.getThread(thread.id);
      assert.equal(fetched.messages.length, 2);
      assert.equal(fetched.messages[0].type, 'user');
      assert.equal(fetched.messages[1].type, 'assistant');
    });

    it('should return all message types when includeAllMessages is true', async () => {
      const thread = await store.createThread();
      await store.appendMessages(thread.id, [
        { type: 'system', subtype: 'init', session_id: 'sess-1' },
        { type: 'user', message: { role: 'user', content: 'Hello' } },
        { type: 'result', subtype: 'success', usage: { input_tokens: 10, output_tokens: 5 } },
      ]);
      const fetched = await store.getThread(thread.id, { includeAllMessages: true });
      assert.equal(fetched.messages.length, 3);
      assert.equal(fetched.messages[0].type, 'system');
      assert.equal(fetched.messages[1].type, 'user');
      assert.equal(fetched.messages[2].type, 'result');
    });
  });

  describe('threads (without append)', () => {
    it('should fall back to get-concat-put when client has no append', async () => {
      const fallbackStore = new OSSAgentStore({ client: new MapStorageClientWithoutAppend() });
      const thread = await fallbackStore.createThread();
      await fallbackStore.appendMessages(thread.id, [{ type: 'user', message: { role: 'user', content: 'Hello' } }]);
      await fallbackStore.appendMessages(thread.id, [
        { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'Hi!' }] } },
      ]);
      const fetched = await fallbackStore.getThread(thread.id);
      assert.equal(fetched.messages.length, 2);
      assert.equal(fetched.messages[0].type, 'user');
      assert.equal(fetched.messages[1].type, 'assistant');
    });
  });

  describe('thread metadata', () => {
    it('should shallow-merge metadata and preserve omitted keys', async () => {
      const thread = await store.createThread({
        bizId: 'order_123',
        source: 'customer_service',
        nested: { old: true },
      });

      await store.updateThreadMetadata(thread.id, {
        source: 'operator_console',
        nested: { replacement: true },
        nullable: null,
      });

      assert.deepStrictEqual((await store.getThread(thread.id)).metadata, {
        bizId: 'order_123',
        source: 'operator_console',
        nested: { replacement: true },
        nullable: null,
      });
    });

    it('should reject updating a missing thread', async () => {
      await assert.rejects(
        () => store.updateThreadMetadata('thread_missing', { bizId: 'order_123' }),
        AgentNotFoundError,
      );
    });

    it('should serialize concurrent updates in the same process', async () => {
      const client = new MapStorageClient();
      const localStore = new OSSAgentStore({ client });
      const thread = await localStore.createThread({ original: true });
      client.delayPutWhenKeyMatches(/threads\/.*\/meta\.json$/, 20);

      await Promise.all([
        localStore.updateThreadMetadata(thread.id, { first: 1 }),
        localStore.updateThreadMetadata(thread.id, { second: 2 }),
      ]);

      assert.deepStrictEqual((await localStore.getThread(thread.id)).metadata, {
        original: true,
        first: 1,
        second: 2,
      });
    });

    it('should not clobber metadata when an updateThreadMetadata races a latestRunId write', async () => {
      const client = new MapStorageClient();
      const localStore = new OSSAgentStore({ client });
      const thread = await localStore.createThread({ original: true });
      // Both writers do a read-modify-write on the same meta.json; the delay
      // forces them to overlap so an unsynchronized pair would clobber.
      client.delayPutWhenKeyMatches(/threads\/.*\/meta\.json$/, 20);

      const [, run] = await Promise.all([
        localStore.updateThreadMetadata(thread.id, { merged: 1 }),
        // createRun fires recordLatestRunId in the background (latestRunId write).
        localStore.createRun([{ role: 'user', content: 'Hi' }], thread.id),
      ]);
      await localStore.awaitPendingWrites();

      const stored = await localStore.getThread(thread.id);
      // The metadata merge survives...
      assert.deepStrictEqual(stored.metadata, { original: true, merged: 1 });
      // ...and so does the latestRunId pointer written by createRun.
      assert.equal(await localStore.getLatestRunId(thread.id), run.id);
    });
  });

  describe('runs', () => {
    it('should create a run', async () => {
      const run = await store.createRun([{ role: 'user', content: 'Hello' }]);
      assert(run.id.startsWith('run_'));
      assert.equal(run.object, 'thread.run');
      assert.equal(run.status, 'queued');
      assert.equal(run.input.length, 1);
      assert(typeof run.createdAt === 'number');
      assert(run.createdAt <= Math.floor(Date.now() / 1000));
    });

    it('should create a run with threadId and config', async () => {
      const run = await store.createRun([{ role: 'user', content: 'Hello' }], 'thread_123', { timeoutMs: 5000 });
      assert.equal(run.threadId, 'thread_123');
      assert.deepEqual(run.config, { timeoutMs: 5000 });
    });

    it('should create a run with metadata', async () => {
      const meta = { user_id: 'u_1', session: 'abc' };
      const run = await store.createRun([{ role: 'user', content: 'Hello' }], 'thread_123', undefined, meta);
      assert.deepEqual(run.metadata, meta);

      const fetched = await store.getRun(run.id);
      assert.deepEqual(fetched.metadata, meta);
    });

    it('should preserve metadata across updateRun', async () => {
      const meta = { tag: 'test' };
      const run = await store.createRun([{ role: 'user', content: 'Hello' }], undefined, undefined, meta);
      await store.updateRun(run.id, { status: 'in_progress', startedAt: Math.floor(Date.now() / 1000) });
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
        completedAt: Math.floor(Date.now() / 1000),
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      });
      const fetched = await store.getRun(run.id);
      assert.equal(fetched.status, 'completed');
      assert(typeof fetched.completedAt === 'number');
      assert.deepStrictEqual(fetched.usage, { promptTokens: 10, completionTokens: 5, totalTokens: 15 });
    });

    it('should not allow overwriting id or object via updateRun', async () => {
      const run = await store.createRun([{ role: 'user', content: 'Hello' }]);
      await store.updateRun(run.id, {
        id: 'run_hacked',
        object: 'thread' as never,
        status: 'completed',
      });
      const fetched = await store.getRun(run.id);
      assert.equal(fetched.id, run.id);
      assert.equal(fetched.object, 'thread.run');
      assert.equal(fetched.status, 'completed');
    });
  });

  describe('recent run id', () => {
    it('should record latestRunId on the thread when createRun has a threadId', async () => {
      const thread = await store.createThread();
      const run = await store.createRun([{ role: 'user', content: 'Hello' }], thread.id);
      // latestRunId is written in the background; drain before asserting.
      await store.awaitPendingWrites();
      assert.equal(await store.getLatestRunId(thread.id), run.id);
    });

    it('should point getLatestRunId at the most recent run', async () => {
      const thread = await store.createThread();
      await store.createRun([{ role: 'user', content: 'first' }], thread.id);
      const second = await store.createRun([{ role: 'user', content: 'second' }], thread.id);
      await store.awaitPendingWrites();
      assert.equal(await store.getLatestRunId(thread.id), second.id);
    });

    it('should preserve existing thread metadata when recording latestRunId', async () => {
      const thread = await store.createThread({ origin: 'audit', agentName: 'foo' });
      const run = await store.createRun([{ role: 'user', content: 'Hello' }], thread.id);
      await store.awaitPendingWrites();
      const fetched = await store.getThread(thread.id);
      assert.deepEqual(fetched.metadata, { origin: 'audit', agentName: 'foo' });
      assert.equal(await store.getLatestRunId(thread.id), run.id);
    });

    it('should return null for a thread that exists but has no run (historical data)', async () => {
      const thread = await store.createThread();
      assert.equal(await store.getLatestRunId(thread.id), null);
    });

    it('should not record latestRunId when createRun has no threadId', async () => {
      const run = await store.createRun([{ role: 'user', content: 'Hello' }]);
      assert(run.id.startsWith('run_'));
      // No thread to query; the run simply has no latest-run pointer anywhere.
    });

    it('should not fail run creation when the threadId does not exist', async () => {
      // Best-effort pointer write: a missing thread meta is swallowed.
      const run = await store.createRun([{ role: 'user', content: 'Hello' }], 'thread_missing');
      assert(run.id.startsWith('run_'));
    });

    it('should throw AgentNotFoundError from getLatestRunId for a non-existent thread', async () => {
      await assert.rejects(
        () => store.getLatestRunId('thread_non_existent'),
        (err: unknown) => {
          assert(err instanceof AgentNotFoundError);
          assert.equal(err.status, 404);
          assert.match(err.message, /Thread thread_non_existent not found/);
          return true;
        },
      );
    });
  });

  describe('init / destroy', () => {
    it('should call client init when present', async () => {
      let initCalled = false;
      const client = new MapStorageClient();
      client.init = async () => {
        initCalled = true;
      };
      const s = new OSSAgentStore({ client });
      await s.init();
      assert.equal(initCalled, true);
    });

    it('should call client destroy when present', async () => {
      let destroyCalled = false;
      const client = new MapStorageClient();
      client.destroy = async () => {
        destroyCalled = true;
      };
      const s = new OSSAgentStore({ client });
      await s.destroy();
      assert.equal(destroyCalled, true);
    });

    it('should not throw when client has no init/destroy', async () => {
      const s = new OSSAgentStore({ client: new MapStorageClient() });
      await s.init();
      await s.destroy();
    });
  });

  describe('prefix', () => {
    it('should use prefix in storage keys', async () => {
      const client = new MapStorageClient();
      const prefixedStore = new OSSAgentStore({ client, prefix: 'myapp/' });

      const thread = await prefixedStore.createThread();
      // Verify we can get it back (proves the prefix is used consistently)
      const fetched = await prefixedStore.getThread(thread.id);
      assert.equal(fetched.id, thread.id);

      const run = await prefixedStore.createRun([{ role: 'user', content: 'Hello' }]);
      const fetchedRun = await prefixedStore.getRun(run.id);
      assert.equal(fetchedRun.id, run.id);
    });

    it('should normalize prefix without trailing slash', async () => {
      const client = new MapStorageClient();
      const withSlash = new OSSAgentStore({ client, prefix: 'myapp/' });
      const withoutSlash = new OSSAgentStore({ client, prefix: 'myapp' });

      // Both stores should write to the same keys
      const thread = await withSlash.createThread();
      const fetched = await withoutSlash.getThread(thread.id);
      assert.equal(fetched.id, thread.id);
    });

    it('should isolate data between different prefixes', async () => {
      const client = new MapStorageClient();
      const store1 = new OSSAgentStore({ client, prefix: 'app1/' });
      const store2 = new OSSAgentStore({ client, prefix: 'app2/' });

      const thread = await store1.createThread();
      await assert.rejects(
        () => store2.getThread(thread.id),
        (err: unknown) => {
          assert(err instanceof AgentNotFoundError);
          return true;
        },
      );
    });
  });

  describe('thread activity index', () => {
    function withFixedNow<T>(ms: number, fn: () => Promise<T>): Promise<T> {
      const realNow = Date.now;
      Date.now = () => ms;
      return Promise.resolve()
        .then(fn)
        .finally(() => {
          Date.now = realNow;
        });
    }

    const INDEX_KEY_RE_AGENT = /^agent\/index\/threads-by-updated-date\/\d{4}-\d{2}-\d{2}\/\d{13}_thread_[0-9a-f-]+$/;
    const INDEX_KEY_RE_ANY =
      /^(?:[^/]+(?:\/[^/]+)*\/)?index\/threads-by-updated-date\/\d{4}-\d{2}-\d{2}\/\d{13}_thread_[0-9a-f-]+$/;

    const T_EARLY = Date.UTC(2025, 10, 13, 8, 0, 0, 0);
    const T_MID = Date.UTC(2025, 10, 13, 8, 0, 1, 234);
    const T_LATE = Date.UTC(2025, 10, 13, 10, 0, 0, 0);

    it('writes a sidecar activity index next to meta.json on createThread', async () => {
      const client = new MapStorageClient();
      const localStore = new OSSAgentStore({ client, prefix: 'agent/' });

      const thread = await withFixedNow(T_MID, () => localStore.createThread({ user: 'alice' }));
      await localStore.awaitPendingWrites();

      const keys = client.keys();
      assert.ok(
        keys.includes(`agent/threads/${thread.id}/meta.json`),
        `meta.json not found amongst keys: ${JSON.stringify(keys)}`,
      );

      const indexKeys = client.keysWithPrefix('agent/index/threads-by-updated-date/');
      assert.equal(indexKeys.length, 1, `expected exactly one index entry, got ${JSON.stringify(indexKeys)}`);
      const indexKey = indexKeys[0];
      assert.match(indexKey, INDEX_KEY_RE_AGENT);

      const expectedRev = reverseMs(T_MID);
      const expectedKey = `agent/index/threads-by-updated-date/2025-11-13/${expectedRev}_${thread.id}`;
      assert.equal(indexKey, expectedKey);
    });

    it('the index body carries threadId, createdAt, updatedAt and a snapshot of metadata', async () => {
      const client = new MapStorageClient();
      const localStore = new OSSAgentStore({ client, prefix: 'agent/' });
      const meta: Record<string, unknown> = { user: 'alice', channel: 'web' };

      const thread = await withFixedNow(T_MID, () => localStore.createThread(meta));
      await localStore.awaitPendingWrites();

      const indexKey = client.keysWithPrefix('agent/index/threads-by-updated-date/')[0];
      const raw = await client.get(indexKey);
      assert.ok(raw, 'index body should be present after drain');
      const body = JSON.parse(raw) as {
        threadId: string;
        createdAt: number;
        updatedAt: number;
        metadata: Record<string, unknown>;
      };

      assert.deepStrictEqual(body, {
        threadId: thread.id,
        createdAt: Math.floor(T_MID / 1000),
        updatedAt: Math.floor(T_MID / 1000),
        metadata: { user: 'alice', channel: 'web' },
      });
      assert.strictEqual(body.createdAt, thread.createdAt);
      assert.strictEqual(body.updatedAt, thread.createdAt);

      meta.user = 'mutated';
      const reread = JSON.parse((await client.get(indexKey))!) as typeof body;
      assert.equal(reread.metadata.user, 'alice');
    });

    it('within a date directory, ASC dictionary order equals time-DESC activity order', async () => {
      const client = new MapStorageClient();
      const localStore = new OSSAgentStore({ client, prefix: 'agent/' });

      const early = await withFixedNow(T_EARLY, () => localStore.createThread({ tag: 'early' }));
      const mid = await withFixedNow(T_MID, () => localStore.createThread({ tag: 'mid' }));
      const late = await withFixedNow(T_LATE, () => localStore.createThread({ tag: 'late' }));
      await localStore.awaitPendingWrites();

      const indexKeys = client.keysWithPrefix('agent/index/threads-by-updated-date/2025-11-13/');
      assert.equal(indexKeys.length, 3);

      const threadIdsInListOrder = indexKeys.map((k) => {
        const fileName = k.slice(k.lastIndexOf('/') + 1);
        return fileName.slice(fileName.indexOf('_') + 1);
      });
      assert.deepStrictEqual(threadIdsInListOrder, [late.id, mid.id, early.id]);

      const revs = indexKeys.map((k) => {
        const fileName = k.slice(k.lastIndexOf('/') + 1);
        return fileName.slice(0, fileName.indexOf('_'));
      });
      assert.deepStrictEqual(revs, [reverseMs(T_LATE), reverseMs(T_MID), reverseMs(T_EARLY)]);
      assert.ok(revs[0] < revs[1] && revs[1] < revs[2], 'revs must be ASCII-ascending');
    });

    it('threads active on either side of a UTC day boundary land in different date buckets', async () => {
      const client = new MapStorageClient();
      const localStore = new OSSAgentStore({ client, prefix: 'agent/' });

      const lastMsOfNov13Utc = Date.UTC(2025, 10, 13, 23, 59, 59, 999);
      const firstMsOfNov14Utc = Date.UTC(2025, 10, 14, 0, 0, 0, 0);

      const earlier = await withFixedNow(lastMsOfNov13Utc, () => localStore.createThread());
      const later = await withFixedNow(firstMsOfNov14Utc, () => localStore.createThread());
      await localStore.awaitPendingWrites();

      const nov13 = client.keysWithPrefix('agent/index/threads-by-updated-date/2025-11-13/');
      const nov14 = client.keysWithPrefix('agent/index/threads-by-updated-date/2025-11-14/');
      assert.equal(nov13.length, 1, `Nov 13 bucket: ${JSON.stringify(nov13)}`);
      assert.equal(nov14.length, 1, `Nov 14 bucket: ${JSON.stringify(nov14)}`);
      assert.ok(nov13[0].endsWith(`_${earlier.id}`));
      assert.ok(nov14[0].endsWith(`_${later.id}`));
    });

    it('createThread does not wait for the index PUT to complete (non-blocking)', async () => {
      const client = new MapStorageClient();
      const localStore = new OSSAgentStore({ client, prefix: 'agent/' });

      const INDEX_DELAY_MS = 120;
      client.delayPutWhenKeyMatches(/^agent\/index\/threads-by-updated-date\//, INDEX_DELAY_MS);

      const t0 = Date.now();
      const thread = await localStore.createThread();
      const elapsedMs = Date.now() - t0;

      assert.ok(
        elapsedMs < INDEX_DELAY_MS - 50,
        `createThread should return before the index PUT settles, but elapsed=${elapsedMs}ms (delay=${INDEX_DELAY_MS}ms)`,
      );

      assert.equal(
        client.keysWithPrefix('agent/index/').length,
        0,
        'the slow background PUT should not be visible at the moment createThread returns',
      );

      assert.ok(await client.get(`agent/threads/${thread.id}/meta.json`));

      await localStore.awaitPendingWrites();
      const indexKeys = client.keysWithPrefix('agent/index/threads-by-updated-date/');
      assert.equal(indexKeys.length, 1);
      assert.ok(indexKeys[0].endsWith(`_${thread.id}`));
    });

    it('createThread succeeds even when the index PUT throws; the failure becomes a single warn line', async () => {
      const client = new MapStorageClient();
      client.failPutWhenKeyMatches(/^agent\/index\/threads-by-updated-date\//);

      const warnCalls: unknown[][] = [];
      const logger = {
        warn(message: string, ...args: unknown[]): void {
          warnCalls.push([message, ...args]);
        },
      };
      const localStore = new OSSAgentStore({
        client,
        prefix: 'agent/',
        logger,
      });

      const thread = await localStore.createThread({ trace: 'fail-path' });
      assert.equal(thread.object, 'thread');
      assert.match(thread.id, /^thread_[0-9a-f-]{36}$/);

      await localStore.awaitPendingWrites();

      const metaRaw = await client.get(`agent/threads/${thread.id}/meta.json`);
      assert.ok(metaRaw, 'meta.json should still be present when only the index PUT failed');
      const metaObj = JSON.parse(metaRaw) as { id: string; createdAt: number };
      assert.equal(metaObj.id, thread.id);
      assert.equal(metaObj.createdAt, thread.createdAt);

      assert.equal(
        client.keysWithPrefix('agent/index/').length,
        0,
        'the simulated index PUT failure means no index entries exist',
      );

      assert.equal(
        warnCalls.length,
        1,
        `expected one warn call, got ${warnCalls.length}: ${JSON.stringify(warnCalls)}`,
      );
      const call = warnCalls[0];
      const formatStr = call[0];
      assert.equal(typeof formatStr, 'string');
      assert.ok(
        (formatStr as string).includes('failed to write thread activity index'),
        `unexpected warn format string: ${String(formatStr)}`,
      );
      assert.equal(call[1], thread.id);
      assert.match(call[2] as string, /^agent\/index\/threads-by-updated-date\/\d{4}-\d{2}-\d{2}\/\d{13}_thread_/);
      const errArg = call[3];
      assert.ok(
        errArg instanceof Error,
        `expected the fourth warn-arg to be an Error instance (so the stack is preserved when the logger renders it), got ${typeof errArg}: ${String(errArg)}`,
      );
      assert.match((errArg as Error).message, /simulated PUT failure/);
      assert.ok(
        !(call[0] as string).includes('err=%s'),
        'the format string should no longer carry an err=%s placeholder',
      );

      const fetched = await localStore.getThread(thread.id);
      assert.equal(fetched.id, thread.id);
    });

    it('with no logger configured, an index PUT failure falls back to console.warn without throwing', async () => {
      const client = new MapStorageClient();
      client.failPutWhenKeyMatches(/^agent\/index\/threads-by-updated-date\//);
      const localStore = new OSSAgentStore({ client, prefix: 'agent/' });

      const realWarn = console.warn;
      const captured: unknown[][] = [];
      console.warn = ((...args: unknown[]) => {
        captured.push(args);
      }) as typeof console.warn;

      try {
        const thread = await localStore.createThread();
        await localStore.awaitPendingWrites();
        assert.equal(captured.length, 1);
        const args = captured[0];
        assert.equal(typeof args[0], 'string');
        assert.ok((args[0] as string).includes('failed to write thread activity index'));
        assert.equal(args[1], thread.id);
      } finally {
        console.warn = realWarn;
      }
    });

    it('destroy() drains in-flight index writes before tearing down the underlying client', async () => {
      const client = new MapStorageClient();
      const localStore = new OSSAgentStore({ client, prefix: 'agent/' });

      const INDEX_DELAY_MS = 120;
      client.delayPutWhenKeyMatches(/^agent\/index\/threads-by-updated-date\//, INDEX_DELAY_MS);

      let clientDestroyCalledAt: number | null = null;
      let indexKeyVisibleAtDestroy = false;
      client.destroy = async () => {
        clientDestroyCalledAt = Date.now();
        indexKeyVisibleAtDestroy = client.keysWithPrefix('agent/index/').length > 0;
      };

      const createReturnedAt = Date.now();
      await localStore.createThread();
      assert.equal(client.keysWithPrefix('agent/index/').length, 0);

      const beforeDestroy = Date.now();
      await localStore.destroy();
      const elapsedMs = Date.now() - beforeDestroy;

      assert.ok(
        elapsedMs >= INDEX_DELAY_MS - 20,
        `destroy() should wait for the in-flight index write, elapsedMs=${elapsedMs}ms delay=${INDEX_DELAY_MS}ms`,
      );

      assert(clientDestroyCalledAt !== null, 'client.destroy should have been invoked');
      assert.ok(
        indexKeyVisibleAtDestroy,
        'the index entry should have been observable to client.destroy, meaning the drain ran first',
      );

      assert.equal(client.keysWithPrefix('agent/index/threads-by-updated-date/').length, 1);
      assert.ok(clientDestroyCalledAt >= createReturnedAt);
    });

    it('destroy() drains a write that arrives during a previous drain iteration', async () => {
      const client = new MapStorageClient();
      const localStore = new OSSAgentStore({ client, prefix: 'agent/' });

      const INDEX_DELAY_MS = 80;
      client.delayPutWhenKeyMatches(/^agent\/index\/threads-by-updated-date\//, INDEX_DELAY_MS);

      const thread1 = await localStore.createThread({ ordinal: 1 });
      assert.equal(
        client.keysWithPrefix('agent/index/threads-by-updated-date/').length,
        0,
        "thread1's index PUT should still be in flight at this instant",
      );

      const destroyP = localStore.destroy();
      const thread2 = await localStore.createThread({ ordinal: 2 });
      await destroyP;

      const indexKeys = client.keysWithPrefix('agent/index/threads-by-updated-date/');
      assert.equal(
        indexKeys.length,
        2,
        `the drain loop should have captured both the original and the late-arriving index write, got ${JSON.stringify(indexKeys)}`,
      );
      const threadIdsInLexOrder = indexKeys
        .map((k) => {
          const fileName = k.slice(k.lastIndexOf('/') + 1);
          return fileName.slice(fileName.indexOf('_') + 1);
        })
        .sort();
      const expectedIds = [thread1.id, thread2.id].sort();
      assert.deepStrictEqual(threadIdsInLexOrder, expectedIds);
    });

    it('awaitPendingWrites() is a no-op resolved promise when there are no pending writes', async () => {
      const client = new MapStorageClient();
      const localStore = new OSSAgentStore({ client, prefix: 'agent/' });

      const t0 = Date.now();
      await localStore.awaitPendingWrites();
      const elapsedMs = Date.now() - t0;
      assert.ok(
        elapsedMs < 50,
        `awaitPendingWrites with an empty queue should resolve immediately, took ${elapsedMs}ms`,
      );

      await localStore.awaitPendingWrites();
      await localStore.awaitPendingWrites();
    });

    it('uses the normalized prefix on the index path, including the empty-prefix case', async () => {
      const bareClient = new MapStorageClient();
      const bareStore = new OSSAgentStore({ client: bareClient });
      await withFixedNow(T_MID, () => bareStore.createThread());
      await bareStore.awaitPendingWrites();
      const bareIndex = bareClient.keysWithPrefix('index/threads-by-updated-date/');
      assert.equal(bareIndex.length, 1);
      assert.ok(!bareIndex[0].startsWith('/'), `expected no leading "/", got ${bareIndex[0]}`);
      assert.match(bareIndex[0], INDEX_KEY_RE_ANY);

      const nestedClient = new MapStorageClient();
      const nestedStore = new OSSAgentStore({ client: nestedClient, prefix: 'a/b' });
      await withFixedNow(T_MID, () => nestedStore.createThread());
      await nestedStore.awaitPendingWrites();
      const nestedIndex = nestedClient.keysWithPrefix('a/b/index/threads-by-updated-date/');
      assert.equal(
        nestedIndex.length,
        1,
        `expected exactly one nested index entry: ${JSON.stringify(nestedClient.keys())}`,
      );
      assert.match(nestedIndex[0], /^a\/b\/index\/threads-by-updated-date\/2025-11-13\/\d{13}_thread_[0-9a-f-]+$/);

      const metaKey = nestedClient.keys().find((k) => k.startsWith('a/b/threads/') && k.endsWith('/meta.json'));
      assert.ok(metaKey, 'meta.json key for the nested prefix should exist');
      const expectedThreadId = metaKey.slice('a/b/threads/'.length, -'/meta.json'.length);
      assert.ok(nestedIndex[0].endsWith(`_${expectedThreadId}`));
    });

    it('appendMessages writes a new activity index entry for a reused historical thread', async () => {
      const client = new MapStorageClient();
      const localStore = new OSSAgentStore({ client, prefix: 'agent/' });

      const createdMs = Date.UTC(2025, 10, 13, 8, 0, 0, 0);
      const updatedMs = Date.UTC(2025, 10, 14, 9, 0, 0, 0);
      const thread = await withFixedNow(createdMs, () => localStore.createThread({ origin: 'audit' }));
      await localStore.awaitPendingWrites();

      const messages: AgentMessage[] = [
        { type: 'user', message: { role: 'user', content: 'hello' } } as unknown as AgentMessage,
        {
          type: 'assistant',
          message: { role: 'assistant', content: [{ type: 'text', text: 'hi' }] },
        } as unknown as AgentMessage,
      ];
      await withFixedNow(updatedMs, () => localStore.appendMessages(thread.id, messages));
      await localStore.awaitPendingWrites();

      const createdDay = client.keysWithPrefix('agent/index/threads-by-updated-date/2025-11-13/');
      const updatedDay = client.keysWithPrefix('agent/index/threads-by-updated-date/2025-11-14/');
      assert.equal(createdDay.length, 1, `created-day index: ${JSON.stringify(createdDay)}`);
      assert.equal(updatedDay.length, 1, `updated-day index: ${JSON.stringify(updatedDay)}`);
      assert.ok(createdDay[0].endsWith(`_${thread.id}`));
      assert.ok(updatedDay[0].endsWith(`_${thread.id}`));

      const updatedBody = JSON.parse((await client.get(updatedDay[0]))!) as {
        threadId: string;
        createdAt: number;
        updatedAt: number;
        metadata: Record<string, unknown>;
      };
      assert.deepStrictEqual(updatedBody, {
        threadId: thread.id,
        createdAt: Math.floor(createdMs / 1000),
        updatedAt: Math.floor(updatedMs / 1000),
        metadata: { origin: 'audit' },
      });
    });

    it('createRun and updateRun never touch the activity index', async () => {
      const client = new MapStorageClient();
      const localStore = new OSSAgentStore({ client, prefix: 'agent/' });

      const thread = await localStore.createThread({ origin: 'audit' });
      await localStore.awaitPendingWrites();
      const indexKeysBefore = client.keysWithPrefix('agent/index/').slice();
      const indexBodyBefore = await client.get(indexKeysBefore[0]);
      assert.equal(indexKeysBefore.length, 1, 'baseline: exactly one index entry from createThread');

      const run = await localStore.createRun(
        [{ role: 'user', content: 'first turn' }],
        thread.id,
        { maxIterations: 1 },
        { trace: 't' },
      );
      await localStore.updateRun(run.id, {
        status: 'completed',
        completedAt: Math.floor(Date.now() / 1000),
      });

      const indexKeysAfter = client.keysWithPrefix('agent/index/').slice();
      assert.deepStrictEqual(
        indexKeysAfter.slice().sort(),
        indexKeysBefore.slice().sort(),
        'no new index keys should appear from run operations',
      );
      const indexBodyAfter = await client.get(indexKeysAfter[0]);
      assert.equal(indexBodyAfter, indexBodyBefore, 'the index body should be byte-identical');
    });
  });
});
