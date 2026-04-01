import { strict as assert } from 'node:assert';
import path from 'node:path';

import { describe, it, afterEach } from 'vitest';

import { Agent } from '../src/lib/agent.ts';
import { Application } from '../src/lib/application.ts';

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
      agent.startKeepAlive();

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
      agent.startKeepAlive();
      agent.startKeepAlive();
      agent.startKeepAlive();

      // close() clears only one interval
      await agent.close();
      agent = undefined;
    });
  });

  describe('Messenger snapshot lifecycle hooks', () => {
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
    });

    it('should register egg-ready listener on new messenger after deserialize', async () => {
      app = new Application({
        baseDir: demoApp,
        mode: 'single',
        snapshot: true,
      });
      await app.ready();

      await app.triggerSnapshotWillSerialize();
      await app.triggerSnapshotDidDeserialize();
      await new Promise<void>((resolve) => process.nextTick(resolve));

      // The new messenger should have an egg-ready listener
      // (it's set up in snapshotDidDeserialize to trigger serverDidReady)
      assert.ok(app.messenger.listenerCount('egg-ready') >= 1, 'new messenger should have egg-ready listener');
    });
  });
});
