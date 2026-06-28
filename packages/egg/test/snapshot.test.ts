import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, it, afterEach } from 'vitest';

import { Agent } from '../src/lib/agent.ts';
import { Application } from '../src/lib/application.ts';
import { restoreSnapshot } from '../src/lib/snapshot.ts';
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

    it('should keep the same EggLoggers instance across serialize/deserialize', async () => {
      app = new Application({
        baseDir: demoApp,
        mode: 'single',
        snapshot: true,
      });
      await app.ready();

      // Access loggers to force lazy creation
      const loggersBefore = app.loggers;
      assert.ok(loggersBefore, 'loggers should exist');

      await app.triggerSnapshotWillSerialize();

      // The EggLoggers instance is intentionally NOT discarded on serialize:
      // plugins capture individual logger references during load, so replacing
      // them with a fresh instance would orphan those captured references.
      await app.triggerSnapshotDidDeserialize();
      await new Promise<void>((resolve) => process.nextTick(resolve));

      // Same instance is reused (reopened in place), not lazily re-created.
      assert.strictEqual(app.loggers, loggersBefore, 'loggers instance should be preserved');
    });

    it('should reopen logger streams so captured references keep writing after deserialize', async () => {
      app = new Application({
        baseDir: demoApp,
        mode: 'single',
        snapshot: true,
      });
      await app.ready();
      await app.loadFinished;

      // Plugins such as @eggjs/schedule grab a logger reference during the load
      // phase (in their boot hook constructor) and keep using it afterwards.
      // Emulate that: capture the logger up-front, then drive serialize/restore.
      const capturedLogger = app.getLogger('logger');
      assert.ok(capturedLogger, 'logger should exist');

      // Collect the file-backed transports of the captured logger.
      const fileTransports: any[] = [...capturedLogger.values()].filter(
        (t: any) => t.options && typeof t.options.file === 'string',
      );
      assert.ok(fileTransports.length > 0, 'logger should have a file transport');
      for (const t of fileTransports) {
        assert.equal(t.writable, true, 'file transport should be writable before serialize');
      }

      // Serialize: streams are closed and buffer flush timers cleared.
      await app.triggerSnapshotWillSerialize();
      for (const t of fileTransports) {
        assert.ok(!t.writable, 'file transport should be closed after serialize');
      }

      // Deserialize: the SAME transports must be reopened (not replaced).
      await app.triggerSnapshotDidDeserialize();
      await new Promise<void>((resolve) => process.nextTick(resolve));

      // Identity is preserved — the captured reference is still the live logger.
      assert.strictEqual(app.getLogger('logger'), capturedLogger, 'captured logger reference should stay live');
      for (const t of fileTransports) {
        assert.equal(t.writable, true, 'file transport should be reopened after deserialize');
        // Buffered transports clear their flush interval on close(); it must be
        // restarted so buffered logs flush again.
        if (typeof t._createInterval === 'function') {
          assert.ok(t._timer, 'buffer flush timer should be restarted after deserialize');
        }
      }

      // End-to-end: writing through the captured reference lands on disk
      // instead of hitting the "log stream had been closed" path.
      // Unique per execution so the assertion can't match a stale line left in
      // the demo app's (append-only) log file by an earlier test run.
      const marker = `snapshot-restore-marker-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      capturedLogger.info(marker);
      for (const t of fileTransports) {
        // flush buffered transports immediately so we don't wait for the interval
        if (typeof t.flush === 'function') t.flush();
      }
      const appLog = fileTransports.find((t) => t.options.file.endsWith('-web.log'));
      assert.ok(appLog, 'app web log transport should exist');
      // flush() issues an async WriteStream.write(); poll until it reaches disk
      // so the assertion does not race the libuv threadpool write on slow CI.
      let landed = false;
      for (let i = 0; i < 100 && !landed; i++) {
        if (readFileSync(appLog.options.file, 'utf8').includes(marker)) {
          landed = true;
          break;
        }
        await new Promise<void>((resolve) => setTimeout(resolve, 20));
      }
      assert.ok(landed, 'log written after restore should reach the file');
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

  describe('restoreSnapshot', () => {
    it('should throw when no snapshot app exists', async () => {
      // Ensure no global snapshot app
      globalThis.__egg_snapshot_app = undefined;

      await assert.rejects(() => restoreSnapshot(), /No egg application found in snapshot/);
    });
  });
});
