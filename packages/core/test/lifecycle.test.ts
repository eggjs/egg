import { strict as assert } from 'node:assert';
import { Lifecycle } from '../src/lifecycle.js';
import { EggCore } from '../src/egg.js';

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
        }
      );
    }, /do not add hook when lifecycle has been initialized/);

    assert.throws(() => {
      lifecycle.addFunctionAsBootHook(() => {
        console.log('test');
      });
    }, /do not add hook when lifecycle has been initialized/);
  });
});
