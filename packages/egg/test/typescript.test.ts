import { describe, it, beforeAll, afterAll } from 'vitest';
import { strict as assert } from 'node:assert';

import { type MockApplication, createApp } from './utils.ts';

describe.skip('test/typescript.test.ts', () => {
  describe('compiler code', () => {
    let app: MockApplication;
    beforeAll(async () => {
      // await coffee.fork(
      //   importResolve('typescript/bin/tsc'),
      //   [
      //     '-b', '--clean',
      //   ],
      //   {
      //     cwd: getFilepath('apps/app-ts'),
      //   },
      // )
      //   .debug()
      //   .expect('code', 0)
      //   .end();

      // await coffee.fork(
      //   importResolve('typescript/bin/tsc'),
      //   [ '-p', getFilepath('apps/app-ts/tsconfig.json') ],
      //   {
      //     cwd: getFilepath('apps/app-ts'),
      //   },
      // )
      //   .debug()
      //   .expect('code', 0)
      //   .end();

      app = createApp('apps/app-ts');
      await app.ready();
    });

    afterAll(async () => {
      await app.close();
      assert.deepStrictEqual(app._app.stages, [
        'configWillLoad',
        'configDidLoad',
        'didLoad',
        'willReady',
        'didReady',
        'serverDidReady',
        'beforeClose',
      ]);
    });

    it('controller run ok', async () => {
      await app
        .httpRequest()
        .get('/foo')
        .expect(200)
        .expect({ env: 'unittest' });
    });

    it('controller of app.router run ok', async () => {
      await app
        .httpRequest()
        .get('/test')
        .expect(200)
        .expect({ env: 'unittest' });
    });
  });

  describe('type check', () => {
    // it('should compile with esModuleInterop without error', async () => {
    //   await coffee.fork(
    //     importResolve('typescript/bin/tsc'),
    //     [ '-p', getFilepath('apps/app-ts-esm/tsconfig.json') ],
    //   )
    //     .debug()
    //     .expect('code', 0)
    //     .end();
    // });
    // it('should compile type-check ts without error', async () => {
    //   await coffee.fork(
    //     importResolve('typescript/bin/tsc'),
    //     [ '-p', getFilepath('apps/app-ts-type-check/tsconfig.json') ],
    //   )
    //     .debug()
    //     .expect('code', 0)
    //     .end();
    // });
    // it('should throw error with type-check-error ts', async () => {
    //   await coffee.fork(
    //     importResolve('typescript/bin/tsc'),
    //     [ '-p', getFilepath('apps/app-ts-type-check/tsconfig-error.json') ],
    //   )
    //     // .debug()
    //     .expect('stdout', /Property 'ctx' is protected/)
    //     .expect('stdout', /Property 'localsCheckAny' does not exist on type 'string'/)
    //     .expect('stdout', /Property 'configKeysCheckAny' does not exist on type 'string'/)
    //     .expect('stdout', /Property 'appCheckAny' does not exist on type 'Application'/)
    //     .expect('stdout', /Property 'serviceLocalCheckAny' does not exist on type 'string'/)
    //     .expect('stdout', /Property 'serviceConfigCheckAny' does not exist on type 'string'/)
    //     .expect('stdout', /Property 'serviceAppCheckAny' does not exist on type 'Application'/)
    //     .expect('stdout', /Property 'checkSingleTon' does not exist/)
    //     .expect('stdout', /Property 'directory' is missing in type '{}' but required in type 'CustomLoaderConfig'/)
    //     .notExpect('stdout', /Cannot find module 'yadan'/)
    //     .expect('stdout', /Expected 1 arguments, but got 0\./)
    //     .expect('stdout', /Expected 0-1 arguments, but got 2\./)
    //     .expect('code', 2)
    //     .end();
    // });
  });
});
