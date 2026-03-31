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
    it('should stop after didLoad and skip willReady/didReady/serverDidReady', async () => {
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

      // configWillLoad, configDidLoad, didLoad should be called
      assert.ok(callOrder.includes('configWillLoad'), 'configWillLoad should be called');
      assert.ok(callOrder.includes('configDidLoad'), 'configDidLoad should be called');
      assert.ok(callOrder.includes('didLoad'), 'didLoad should be called');

      // willReady, didReady, serverDidReady should NOT be called
      assert.ok(!callOrder.includes('willReady'), 'willReady should NOT be called in snapshot mode');
      assert.ok(!callOrder.includes('didReady'), 'didReady should NOT be called in snapshot mode');
      assert.ok(!callOrder.includes('serverDidReady'), 'serverDidReady should NOT be called in snapshot mode');

      await lifecycle.close();
    });

    it('should call willReady/didReady when snapshot is not set', async () => {
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

    it('should mark ready immediately after didLoad completes in snapshot mode', async () => {
      let didLoadCompleted = false;

      const lifecycle = new Lifecycle({
        baseDir: '.',
        app: new EggCore(),
        snapshot: true,
      });

      lifecycle.addBootHook(
        class Boot {
          async didLoad(): Promise<void> {
            didLoadCompleted = true;
          }
        },
      );

      lifecycle.init();
      lifecycle.triggerConfigWillLoad();
      await lifecycle.ready();

      assert.ok(didLoadCompleted, 'didLoad should have completed');

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

    it('should become ready after didLoad in snapshot mode (EggCore level)', async () => {
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

      assert.ok(callOrder.includes('didLoad'), 'didLoad should be called');
      assert.ok(!callOrder.includes('willReady'), 'willReady should NOT be called');
      assert.ok(!callOrder.includes('didReady'), 'didReady should NOT be called');
    });
  });
});
