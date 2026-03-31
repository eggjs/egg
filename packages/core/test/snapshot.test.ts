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
