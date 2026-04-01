import { strict as assert } from 'node:assert';

import { describe, it, afterEach } from 'vitest';

import { EggCore } from '../src/egg.ts';
import { Lifecycle } from '../src/lifecycle.ts';

describe('test/snapshot.test.ts', () => {
  let app: EggCore | undefined;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  describe('Lifecycle snapshot mode', () => {
    it('should stop after configWillLoad and skip configDidLoad/didLoad/willReady/didReady/serverDidReady', async () => {
      const callOrder: string[] = [];

      const lifecycle = new Lifecycle({
        baseDir: '.',
        app: new EggCore(),
        snapshot: true,
      });

      lifecycle.addBootHook(
        class Boot {
          configWillLoad(): void {
            callOrder.push('configWillLoad');
          }

          configDidLoad(): void {
            callOrder.push('configDidLoad');
          }

          async didLoad(): Promise<void> {
            callOrder.push('didLoad');
          }

          async willReady(): Promise<void> {
            callOrder.push('willReady');
          }

          async didReady(): Promise<void> {
            callOrder.push('didReady');
          }

          async serverDidReady(): Promise<void> {
            callOrder.push('serverDidReady');
          }
        },
      );

      lifecycle.init();
      lifecycle.triggerConfigWillLoad();
      await lifecycle.ready();

      // configWillLoad should be called
      assert.ok(callOrder.includes('configWillLoad'), 'configWillLoad should be called');

      // configDidLoad and all later hooks should NOT be called
      assert.ok(!callOrder.includes('configDidLoad'), 'configDidLoad should NOT be called in snapshot mode');
      assert.ok(!callOrder.includes('didLoad'), 'didLoad should NOT be called in snapshot mode');
      assert.ok(!callOrder.includes('willReady'), 'willReady should NOT be called in snapshot mode');
      assert.ok(!callOrder.includes('didReady'), 'didReady should NOT be called in snapshot mode');
      assert.ok(!callOrder.includes('serverDidReady'), 'serverDidReady should NOT be called in snapshot mode');

      await lifecycle.close();
    });

    it('should call all lifecycle hooks when snapshot is not set', async () => {
      const callOrder: string[] = [];

      const lifecycle = new Lifecycle({
        baseDir: '.',
        app: new EggCore(),
        // no snapshot option
      });

      lifecycle.addBootHook(
        class Boot {
          configWillLoad(): void {
            callOrder.push('configWillLoad');
          }

          configDidLoad(): void {
            callOrder.push('configDidLoad');
          }

          async didLoad(): Promise<void> {
            callOrder.push('didLoad');
          }

          async willReady(): Promise<void> {
            callOrder.push('willReady');
          }

          async didReady(): Promise<void> {
            callOrder.push('didReady');
          }
        },
      );

      lifecycle.init();
      lifecycle.triggerConfigWillLoad();
      await lifecycle.ready();

      // All hooks should be called in normal mode
      assert.ok(callOrder.includes('configWillLoad'), 'configWillLoad should be called');
      assert.ok(callOrder.includes('configDidLoad'), 'configDidLoad should be called');
      assert.ok(callOrder.includes('didLoad'), 'didLoad should be called');
      assert.ok(callOrder.includes('willReady'), 'willReady should be called in normal mode');
      assert.ok(callOrder.includes('didReady'), 'didReady should be called in normal mode');

      await lifecycle.close();
    });

    it('should mark ready immediately after configWillLoad in snapshot mode', async () => {
      let configWillLoadCompleted = false;
      let configDidLoadCalled = false;
      let didLoadCalled = false;

      const lifecycle = new Lifecycle({
        baseDir: '.',
        app: new EggCore(),
        snapshot: true,
      });

      lifecycle.addBootHook(
        class Boot {
          configWillLoad(): void {
            configWillLoadCompleted = true;
          }

          configDidLoad(): void {
            configDidLoadCalled = true;
          }

          async didLoad(): Promise<void> {
            didLoadCalled = true;
          }
        },
      );

      lifecycle.init();
      lifecycle.triggerConfigWillLoad();
      await lifecycle.ready();

      assert.ok(configWillLoadCompleted, 'configWillLoad should have completed');
      assert.ok(!configDidLoadCalled, 'configDidLoad should NOT be called in snapshot mode');
      assert.ok(!didLoadCalled, 'didLoad should NOT be called in snapshot mode');

      await lifecycle.close();
    });

    it('should not register beforeClose hooks in snapshot mode (configDidLoad skipped)', async () => {
      let beforeCloseCalled = false;

      const lifecycle = new Lifecycle({
        baseDir: '.',
        app: new EggCore(),
        snapshot: true,
      });

      lifecycle.addBootHook(
        class Boot {
          configWillLoad(): void {
            // configWillLoad runs in snapshot mode
          }

          configDidLoad(): void {
            // configDidLoad is skipped in snapshot mode
          }

          async beforeClose(): Promise<void> {
            beforeCloseCalled = true;
          }
        },
      );

      lifecycle.init();
      lifecycle.triggerConfigWillLoad();
      await lifecycle.ready();
      await lifecycle.close();

      // beforeClose is registered during configDidLoad iteration, which is skipped
      assert.ok(!beforeCloseCalled, 'beforeClose should NOT be called since configDidLoad is skipped');
    });
  });

  describe('snapshotWillSerialize / snapshotDidDeserialize lifecycle hooks', () => {
    it('should call snapshotWillSerialize in reverse registration order', async () => {
      const callOrder: string[] = [];

      const lifecycle = new Lifecycle({
        baseDir: '.',
        app: new EggCore(),
        snapshot: true,
      });

      lifecycle.addBootHook(
        class BootA {
          configWillLoad(): void {
            callOrder.push('configWillLoad:A');
          }
          async snapshotWillSerialize(): Promise<void> {
            callOrder.push('snapshotWillSerialize:A');
          }
        },
      );

      lifecycle.addBootHook(
        class BootB {
          configWillLoad(): void {
            callOrder.push('configWillLoad:B');
          }
          async snapshotWillSerialize(): Promise<void> {
            callOrder.push('snapshotWillSerialize:B');
          }
        },
      );

      lifecycle.addBootHook(
        class BootC {
          configWillLoad(): void {
            callOrder.push('configWillLoad:C');
          }
          async snapshotWillSerialize(): Promise<void> {
            callOrder.push('snapshotWillSerialize:C');
          }
        },
      );

      lifecycle.init();
      lifecycle.triggerConfigWillLoad();
      await lifecycle.ready();

      // configWillLoad runs in forward order
      assert.deepEqual(callOrder, ['configWillLoad:A', 'configWillLoad:B', 'configWillLoad:C']);

      // Now trigger serialize — should be in REVERSE order
      await lifecycle.triggerSnapshotWillSerialize();

      assert.deepEqual(callOrder, [
        'configWillLoad:A',
        'configWillLoad:B',
        'configWillLoad:C',
        'snapshotWillSerialize:C',
        'snapshotWillSerialize:B',
        'snapshotWillSerialize:A',
      ]);

      await lifecycle.close();
    });

    it('should call snapshotDidDeserialize in forward registration order', async () => {
      const callOrder: string[] = [];

      const lifecycle = new Lifecycle({
        baseDir: '.',
        app: new EggCore(),
        snapshot: true,
      });

      lifecycle.addBootHook(
        class BootA {
          configWillLoad(): void {
            callOrder.push('configWillLoad:A');
          }
          async snapshotDidDeserialize(): Promise<void> {
            callOrder.push('snapshotDidDeserialize:A');
          }
          configDidLoad(): void {
            callOrder.push('configDidLoad:A');
          }
        },
      );

      lifecycle.addBootHook(
        class BootB {
          configWillLoad(): void {
            callOrder.push('configWillLoad:B');
          }
          async snapshotDidDeserialize(): Promise<void> {
            callOrder.push('snapshotDidDeserialize:B');
          }
          configDidLoad(): void {
            callOrder.push('configDidLoad:B');
          }
        },
      );

      lifecycle.init();
      lifecycle.triggerConfigWillLoad();
      await lifecycle.ready();

      // Only configWillLoad should have run (snapshot mode)
      assert.deepEqual(callOrder, ['configWillLoad:A', 'configWillLoad:B']);

      // Trigger deserialize — should be in FORWARD order
      // and then resume lifecycle from configDidLoad.
      // triggerSnapshotDidDeserialize waits for the full lifecycle internally.
      await lifecycle.triggerSnapshotDidDeserialize();

      assert.deepEqual(callOrder, [
        'configWillLoad:A',
        'configWillLoad:B',
        'snapshotDidDeserialize:A',
        'snapshotDidDeserialize:B',
        'configDidLoad:A',
        'configDidLoad:B',
      ]);

      await lifecycle.close();
    });

    it('should resume full lifecycle after snapshotDidDeserialize', async () => {
      const callOrder: string[] = [];

      const lifecycle = new Lifecycle({
        baseDir: '.',
        app: new EggCore(),
        snapshot: true,
      });

      lifecycle.addBootHook(
        class Boot {
          configWillLoad(): void {
            callOrder.push('configWillLoad');
          }
          async snapshotWillSerialize(): Promise<void> {
            callOrder.push('snapshotWillSerialize');
          }
          async snapshotDidDeserialize(): Promise<void> {
            callOrder.push('snapshotDidDeserialize');
          }
          configDidLoad(): void {
            callOrder.push('configDidLoad');
          }
          async didLoad(): Promise<void> {
            callOrder.push('didLoad');
          }
          async willReady(): Promise<void> {
            callOrder.push('willReady');
          }
          async didReady(): Promise<void> {
            callOrder.push('didReady');
          }
        },
      );

      lifecycle.init();
      lifecycle.triggerConfigWillLoad();
      await lifecycle.ready();

      // Phase 1: snapshot build — only configWillLoad ran
      assert.deepEqual(callOrder, ['configWillLoad']);

      // Phase 2: serialize
      await lifecycle.triggerSnapshotWillSerialize();
      assert.deepEqual(callOrder, ['configWillLoad', 'snapshotWillSerialize']);

      // Phase 3: deserialize — resumes lifecycle.
      // triggerSnapshotDidDeserialize resets ready state, resumes from
      // configDidLoad, and waits for the full lifecycle to complete.
      await lifecycle.triggerSnapshotDidDeserialize();

      // didReady fires asynchronously after ready resolves (non-blocking),
      // so give it a tick to complete.
      await new Promise<void>((resolve) => process.nextTick(resolve));

      assert.deepEqual(callOrder, [
        'configWillLoad',
        'snapshotWillSerialize',
        'snapshotDidDeserialize',
        'configDidLoad',
        'didLoad',
        'willReady',
        'didReady',
      ]);

      await lifecycle.close();
    });

    it('should handle async hooks correctly', async () => {
      const callOrder: string[] = [];

      const lifecycle = new Lifecycle({
        baseDir: '.',
        app: new EggCore(),
        snapshot: true,
      });

      lifecycle.addBootHook(
        class Boot {
          configWillLoad(): void {
            callOrder.push('configWillLoad');
          }
          async snapshotWillSerialize(): Promise<void> {
            await new Promise<void>((resolve) => setTimeout(resolve, 10));
            callOrder.push('snapshotWillSerialize:async');
          }
          async snapshotDidDeserialize(): Promise<void> {
            await new Promise<void>((resolve) => setTimeout(resolve, 10));
            callOrder.push('snapshotDidDeserialize:async');
          }
          configDidLoad(): void {
            callOrder.push('configDidLoad');
          }
        },
      );

      lifecycle.init();
      lifecycle.triggerConfigWillLoad();
      await lifecycle.ready();

      await lifecycle.triggerSnapshotWillSerialize();
      assert.ok(callOrder.includes('snapshotWillSerialize:async'), 'async serialize hook should have completed');

      await lifecycle.triggerSnapshotDidDeserialize();
      assert.ok(callOrder.includes('snapshotDidDeserialize:async'), 'async deserialize hook should have completed');
      assert.ok(callOrder.includes('configDidLoad'), 'configDidLoad should have been called after deserialize');

      await lifecycle.close();
    });

    it('should handle sync hooks correctly', async () => {
      const callOrder: string[] = [];

      const lifecycle = new Lifecycle({
        baseDir: '.',
        app: new EggCore(),
        snapshot: true,
      });

      lifecycle.addBootHook(
        class Boot {
          configWillLoad(): void {
            callOrder.push('configWillLoad');
          }
          snapshotWillSerialize(): void {
            callOrder.push('snapshotWillSerialize:sync');
          }
          snapshotDidDeserialize(): void {
            callOrder.push('snapshotDidDeserialize:sync');
          }
          configDidLoad(): void {
            callOrder.push('configDidLoad');
          }
        },
      );

      lifecycle.init();
      lifecycle.triggerConfigWillLoad();
      await lifecycle.ready();

      await lifecycle.triggerSnapshotWillSerialize();
      assert.ok(callOrder.includes('snapshotWillSerialize:sync'));

      await lifecycle.triggerSnapshotDidDeserialize();
      assert.ok(callOrder.includes('snapshotDidDeserialize:sync'));
      assert.ok(callOrder.includes('configDidLoad'));

      await lifecycle.close();
    });

    it('should emit error when snapshotWillSerialize hook throws', async () => {
      const lifecycle = new Lifecycle({
        baseDir: '.',
        app: new EggCore(),
        snapshot: true,
      });

      const errors: Error[] = [];
      lifecycle.on('error', (err: Error) => {
        errors.push(err);
      });

      lifecycle.addBootHook(
        class Boot {
          configWillLoad(): void {
            // noop
          }
          async snapshotWillSerialize(): Promise<void> {
            throw new Error('serialize failed');
          }
        },
      );

      lifecycle.init();
      lifecycle.triggerConfigWillLoad();
      await lifecycle.ready();

      await lifecycle.triggerSnapshotWillSerialize();
      assert.equal(errors.length, 1);
      assert.equal(errors[0].message, 'serialize failed');

      await lifecycle.close();
    });

    it('should emit error when snapshotDidDeserialize hook throws', async () => {
      const lifecycle = new Lifecycle({
        baseDir: '.',
        app: new EggCore(),
        snapshot: true,
      });

      const errors: Error[] = [];
      lifecycle.on('error', (err: Error) => {
        errors.push(err);
      });

      lifecycle.addBootHook(
        class Boot {
          configWillLoad(): void {
            // noop
          }
          async snapshotDidDeserialize(): Promise<void> {
            throw new Error('deserialize failed');
          }
        },
      );

      lifecycle.init();
      lifecycle.triggerConfigWillLoad();
      await lifecycle.ready();

      await lifecycle.triggerSnapshotDidDeserialize();
      assert.ok(errors.some((e) => e.message === 'deserialize failed'));

      await lifecycle.close();
    });

    it('should work with EggCore.triggerSnapshotWillSerialize/triggerSnapshotDidDeserialize', async () => {
      const callOrder: string[] = [];

      app = new EggCore({ snapshot: true });

      app.lifecycle.addBootHook(
        class Boot {
          configWillLoad(): void {
            callOrder.push('configWillLoad');
          }
          async snapshotWillSerialize(): Promise<void> {
            callOrder.push('snapshotWillSerialize');
          }
          async snapshotDidDeserialize(): Promise<void> {
            callOrder.push('snapshotDidDeserialize');
          }
          configDidLoad(): void {
            callOrder.push('configDidLoad');
          }
          async didLoad(): Promise<void> {
            callOrder.push('didLoad');
          }
          async willReady(): Promise<void> {
            callOrder.push('willReady');
          }
        },
      );

      app.lifecycle.init();
      app.lifecycle.triggerConfigWillLoad();
      await app.ready();

      // Snapshot build phase
      assert.deepEqual(callOrder, ['configWillLoad']);

      // Serialize via EggCore method
      await app.triggerSnapshotWillSerialize();
      assert.deepEqual(callOrder, ['configWillLoad', 'snapshotWillSerialize']);

      // Deserialize via EggCore method — resumes lifecycle
      await app.triggerSnapshotDidDeserialize();

      assert.deepEqual(callOrder, [
        'configWillLoad',
        'snapshotWillSerialize',
        'snapshotDidDeserialize',
        'configDidLoad',
        'didLoad',
        'willReady',
      ]);
    });

    it('should skip boots that do not implement snapshot hooks', async () => {
      const callOrder: string[] = [];

      const lifecycle = new Lifecycle({
        baseDir: '.',
        app: new EggCore(),
        snapshot: true,
      });

      lifecycle.addBootHook(
        class BootWithHooks {
          configWillLoad(): void {
            callOrder.push('configWillLoad:with');
          }
          async snapshotWillSerialize(): Promise<void> {
            callOrder.push('snapshotWillSerialize:with');
          }
          async snapshotDidDeserialize(): Promise<void> {
            callOrder.push('snapshotDidDeserialize:with');
          }
          configDidLoad(): void {
            callOrder.push('configDidLoad:with');
          }
        },
      );

      lifecycle.addBootHook(
        class BootWithoutHooks {
          configWillLoad(): void {
            callOrder.push('configWillLoad:without');
          }
          configDidLoad(): void {
            callOrder.push('configDidLoad:without');
          }
        },
      );

      lifecycle.init();
      lifecycle.triggerConfigWillLoad();
      await lifecycle.ready();

      await lifecycle.triggerSnapshotWillSerialize();
      // Only BootWithHooks should appear in snapshot hooks
      assert.deepEqual(callOrder, ['configWillLoad:with', 'configWillLoad:without', 'snapshotWillSerialize:with']);

      await lifecycle.triggerSnapshotDidDeserialize();

      assert.deepEqual(callOrder, [
        'configWillLoad:with',
        'configWillLoad:without',
        'snapshotWillSerialize:with',
        'snapshotDidDeserialize:with',
        'configDidLoad:with',
        'configDidLoad:without',
      ]);

      await lifecycle.close();
    });
  });

  describe('EggCore snapshot option', () => {
    it('should pass snapshot option to lifecycle', () => {
      app = new EggCore({ snapshot: true });
      assert.equal(app.options.snapshot, true);
      assert.equal(app.lifecycle.options.snapshot, true);
    });

    it('should not set snapshot by default', () => {
      app = new EggCore();
      assert.equal(app.options.snapshot, undefined);
      assert.equal(app.lifecycle.options.snapshot, undefined);
    });

    it('should become ready after configWillLoad in snapshot mode (EggCore level)', async () => {
      const callOrder: string[] = [];

      app = new EggCore({ snapshot: true });

      app.lifecycle.addBootHook(
        class Boot {
          configWillLoad(): void {
            callOrder.push('configWillLoad');
          }

          configDidLoad(): void {
            callOrder.push('configDidLoad');
          }

          async didLoad(): Promise<void> {
            callOrder.push('didLoad');
          }

          async willReady(): Promise<void> {
            callOrder.push('willReady');
          }

          async didReady(): Promise<void> {
            callOrder.push('didReady');
          }
        },
      );

      app.lifecycle.init();
      app.lifecycle.triggerConfigWillLoad();
      await app.ready();

      assert.ok(callOrder.includes('configWillLoad'), 'configWillLoad should be called');
      assert.ok(!callOrder.includes('configDidLoad'), 'configDidLoad should NOT be called');
      assert.ok(!callOrder.includes('didLoad'), 'didLoad should NOT be called');
      assert.ok(!callOrder.includes('willReady'), 'willReady should NOT be called');
      assert.ok(!callOrder.includes('didReady'), 'didReady should NOT be called');
    });
  });
});
