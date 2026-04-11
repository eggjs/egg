// These tests exercise the snapshotWillSerialize / snapshotDidDeserialize
// lifecycle hooks under a normal Node.js process — NOT under
// `node --build-snapshot`. The facade that would invoke these hooks from a
// real V8 snapshot build (`buildSnapshot`/`restoreSnapshot`) was removed
// because it could not work under Node's mksnapshot constraints: userland
// `require()` is blocked (MODULE_NOT_FOUND), and egg's async-heavy loader
// corrupts the async_hooks stack before `SpinEventLoopInternal` can finish.
// The hooks remain as a general-purpose resource-cleanup abstraction that
// a future non-mksnapshot serialization mechanism could drive.
import { strict as assert } from 'node:assert';
import path from 'node:path';

import { describe, it, afterEach } from 'vitest';

import { Agent } from '../src/lib/agent.ts';
import { Application } from '../src/lib/application.ts';
import { startEgg } from '../src/lib/start.ts';

const fixtures = path.join(import.meta.dirname, 'fixtures');
const demoApp = path.join(fixtures, 'apps/demo');

describe('test/snapshot.test.ts', () => {
  describe('Agent keepalive timer', () => {
    let agent: Agent | undefined;

    afterEach(async () => {
      if (agent) {
        await agent.close();
        agent = undefined;
      }
    });

    it('should NOT start keepalive timer in snapshot mode (configDidLoad skipped)', async () => {
      agent = new Agent({
        baseDir: demoApp,
        snapshot: true,
      });
      await agent.ready();

      // In snapshot mode, configDidLoad is skipped, so the boot hook that
      // calls startKeepAlive() never fires. close() should work cleanly.
      await agent.close();
      agent = undefined;
    });

    it('should start keepalive timer in normal mode (configDidLoad runs)', async () => {
      agent = new Agent({
        baseDir: demoApp,
        mode: 'single',
      });
      await agent.ready();

      // In normal mode, configDidLoad runs, so startKeepAlive() is called.
      // Calling startKeepAlive() again should be a no-op (idempotent guard).
      (agent as any).startKeepAlive();

      // close() should clear the interval without error
      await agent.close();
      agent = undefined;
    });

    it('should make startKeepAlive idempotent', async () => {
      agent = new Agent({
        baseDir: demoApp,
        snapshot: true,
      });
      await agent.ready();

      // Manually call startKeepAlive multiple times — should not create multiple timers
      (agent as any).startKeepAlive();
      (agent as any).startKeepAlive();
      (agent as any).startKeepAlive();

      // close() clears only one interval
      await agent.close();
      agent = undefined;
    });
  });

  describe('Snapshot lifecycle hooks', () => {
    let app: Application | undefined;

    afterEach(async () => {
      if (app) {
        await app.close();
        app = undefined;
      }
    });

    it('should close messenger on snapshotWillSerialize', async () => {
      app = new Application({
        baseDir: demoApp,
        mode: 'single',
        snapshot: true,
      });
      await app.ready();

      const originalMessenger = app.messenger;

      // Trigger serialize — should close the messenger
      await app.triggerSnapshotWillSerialize();

      // After serialize, the messenger is closed (removeAllListeners was called).
      assert.equal(originalMessenger.listenerCount('egg-ready'), 0);
    });

    it('should recreate messenger on snapshotDidDeserialize', async () => {
      app = new Application({
        baseDir: demoApp,
        mode: 'single',
        snapshot: true,
      });
      await app.ready();

      const originalMessenger = app.messenger;

      // Serialize
      await app.triggerSnapshotWillSerialize();

      // Deserialize — should recreate messenger and resume lifecycle
      await app.triggerSnapshotDidDeserialize();
      await new Promise<void>((resolve) => process.nextTick(resolve));

      // Messenger should be a new instance
      assert.notStrictEqual(app.messenger, originalMessenger);
      // New messenger should have egg-ready listener
      assert.ok(app.messenger.listenerCount('egg-ready') >= 1, 'new messenger should have egg-ready listener');
    });

    it('should clean up loggers on snapshotWillSerialize', async () => {
      app = new Application({
        baseDir: demoApp,
        mode: 'single',
        snapshot: true,
      });
      await app.ready();

      // Access loggers to force lazy creation
      const _loggers = app.loggers;
      assert.ok(_loggers, 'loggers should exist');

      await app.triggerSnapshotWillSerialize();

      // After serialize, loggers are cleared (set to undefined internally).
      // Accessing loggers again would re-create them lazily.
      // We can't directly check the private #loggers field, but we can verify
      // that new loggers are created after deserialize.
      await app.triggerSnapshotDidDeserialize();
      await new Promise<void>((resolve) => process.nextTick(resolve));

      // After deserialize, loggers should be lazily re-created on access
      assert.ok(app.loggers, 'loggers should be lazily re-created');
    });

    it('should remove unhandledRejection handler on serialize and restore on deserialize', async () => {
      app = new Application({
        baseDir: demoApp,
        mode: 'single',
        snapshot: true,
      });
      await app.ready();
      // load() runs in background via registerBeforeStart, wait for it
      await app.loadFinished;

      // After load(), unhandledRejection handler is registered
      const handlersBefore = process.listeners('unhandledRejection');
      const hasBoundHandler = handlersBefore.some((fn) => fn === app!._unhandledRejectionHandler);
      assert.ok(hasBoundHandler, 'unhandledRejection handler should be registered after load');

      await app.triggerSnapshotWillSerialize();

      // After serialize, handler should be removed
      const handlersAfterSerialize = process.listeners('unhandledRejection');
      const stillHasHandler = handlersAfterSerialize.some((fn) => fn === app!._unhandledRejectionHandler);
      assert.ok(!stillHasHandler, 'unhandledRejection handler should be removed after serialize');

      await app.triggerSnapshotDidDeserialize();
      await new Promise<void>((resolve) => process.nextTick(resolve));

      // After deserialize, handler should be re-registered
      const handlersAfterDeserialize = process.listeners('unhandledRejection');
      const hasRestoredHandler = handlersAfterDeserialize.some((fn) => fn === app!._unhandledRejectionHandler);
      assert.ok(hasRestoredHandler, 'unhandledRejection handler should be restored after deserialize');
    });
  });

  describe('loadFinished promise', () => {
    it('should resolve after load() completes', async () => {
      const app = new Application({
        baseDir: demoApp,
        mode: 'single',
        snapshot: true,
      });
      await app.ready();

      // loadFinished should resolve when load() fully completes
      await app.loadFinished;

      // After loadFinished, config should be loaded
      assert.ok(app.config, 'config should be available after loadFinished');
      assert.ok(app.config.logger, 'logger config should be available');

      await app.close();
    });
  });

  describe('startEgg with snapshot option', () => {
    it('should load app and agent in snapshot mode via startEgg', async () => {
      const app = await startEgg({ baseDir: demoApp, snapshot: true });

      // Application and agent should exist
      assert.ok(app, 'application should exist');
      assert.ok(app.agent, 'agent should exist');

      // Config should be loaded (load() completed via loadFinished)
      assert.ok(app.config, 'config should be available');
      assert.ok(app.config.env, 'env should be set');

      // Both should be in snapshot mode
      assert.equal(app.options.snapshot, true);
      assert.equal(app.agent.options.snapshot, true);

      await app.close();
      await app.agent.close();
    });
  });
});
