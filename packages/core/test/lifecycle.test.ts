import { strict as assert } from 'node:assert';

import { describe, it } from 'vitest';

import { EggCore } from '../src/egg.ts';
import { Lifecycle } from '../src/lifecycle.ts';

describe('test/lifecycle.test.ts', () => {
  it('should forbid adding hook after initialization', () => {
    const lifecycle = new Lifecycle({
      baseDir: '.',
      app: new EggCore(),
    });

    lifecycle.init();
    assert.throws(() => {
      lifecycle.addBootHook(
        class Hook {
          app: EggCore;
          constructor(app: EggCore) {
            this.app = app;
          }
          configDidLoad() {
            console.log('test');
          }
        },
      );
    }, /do not add hook when lifecycle has been initialized/);

    assert.throws(() => {
      lifecycle.addFunctionAsBootHook(() => {
        console.log('test');
      });
    }, /do not add hook when lifecycle has been initialized/);
  });

  it('should refuse (not throw) registerBeforeClose after close', async () => {
    const lifecycle = new Lifecycle({
      baseDir: '.',
      app: new EggCore(),
    });

    await lifecycle.close();
    assert.equal(lifecycle.isClosed, true);

    // A teardown race may register a close hook after close() has finished
    // (e.g. lazy logger creation under vitest isolate:false on Windows CI).
    // It must be a no-op that returns false instead of throwing "app has been
    // closed".
    let called = false;
    let registered: boolean | undefined;
    assert.doesNotThrow(() => {
      registered = lifecycle.registerBeforeClose(() => {
        called = true;
      });
    });
    // the hook is refused and never invoked, since close already ran
    assert.equal(registered, false);
    assert.equal(called, false);
  });

  it('should refuse registerBeforeClose while close is in progress', async () => {
    const lifecycle = new Lifecycle({
      baseDir: '.',
      app: new EggCore(),
    });

    // a slow close hook that tries to register another hook mid-close, mimicking
    // an in-flight load reaching registerBeforeClose after the close-callback
    // snapshot is taken but before close() finishes.
    let stranded = false;
    let registeredWhileClosing: boolean | undefined;
    lifecycle.registerBeforeClose(async () => {
      assert.equal(lifecycle.isClosing, true);
      registeredWhileClosing = lifecycle.registerBeforeClose(() => {
        stranded = true;
      });
    });

    await lifecycle.close();

    // the late hook must be refused so it is not silently stranded
    assert.equal(registeredWhileClosing, false);
    assert.equal(stranded, false);
    assert.equal(lifecycle.isClosed, true);
  });
});
