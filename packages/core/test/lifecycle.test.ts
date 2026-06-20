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

  it('should not throw when registerBeforeClose is called after close', async () => {
    const lifecycle = new Lifecycle({
      baseDir: '.',
      app: new EggCore(),
    });

    await lifecycle.close();
    assert.equal(lifecycle.isClosed, true);

    // A teardown race may register a close hook after close() has finished
    // (e.g. lazy logger creation under vitest isolate:false on Windows CI).
    // It must be a no-op instead of throwing "app has been closed".
    let called = false;
    assert.doesNotThrow(() => {
      lifecycle.registerBeforeClose(() => {
        called = true;
      });
    });
    // the hook is skipped, never invoked, since close already ran
    assert.equal(called, false);
  });
});
