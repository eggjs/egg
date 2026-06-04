import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterEach } from 'vitest';

import { cluster } from './utils.ts';

// node v24 will hang when test this file
// FIXME: should enable this test after node v24 is stable
describe.skipIf(process.version.startsWith('v24') || process.platform === 'win32')('test/app_worker.test.ts', () => {
  let app: MockApplication;
  afterEach(() => app && app.close());
  afterEach(mm.restore);

  describe('app worker error', () => {
    it('should exit when app worker error during boot', () => {
      app = cluster('apps/worker-die');

      return (
        app
          // .debug()
          .expect('code', 1)
          .end()
      );
    });

    it('should exit when emit error during app worker boot', () => {
      app = cluster('apps/app-start-error', {
        opt: {
          env: Object.assign({}, process.env, {
            EGG_APP_WORKER_LOGGER_LEVEL: 'INFO',
          }),
        },
      });

      return (
        app
          // .debug()
          .expect('code', 1)
          .expect('stderr', /Error: mock error/)
          .expect('stderr', /app_worker#1:\d+ start fail/)
          .end()
      );
    });

    it('should FrameworkErrorformater work during app boot', () => {
      app = cluster('apps/app-start-framework-error', {
        opt: {
          env: Object.assign({}, process.env, {
            EGG_APP_WORKER_LOGGER_LEVEL: 'INFO',
          }),
        },
      });

      return (
        app
          .debug()
          .expect('code', 1)
          .expect('stderr', /CustomError: mock error/)
          // .expect('stderr', /CustomError: mock error \[ https\:\/\/eggjs\.org\/zh-cn\/faq\/customPlugin_99 \]/)
          .end()
      );
    });

    it('should FrameworkErrorformater work during app boot ready', () => {
      app = cluster('apps/app-start-framework-ready-error', {
        opt: {
          env: Object.assign({}, process.env, {
            EGG_APP_WORKER_LOGGER_LEVEL: 'INFO',
          }),
        },
      });

      return (
        app
          // .debug()
          .expect('code', 1)
          .expect('stderr', /CustomError: mock error/)
          // .expect('stderr', /CustomError: mock error \[ https\:\/\/eggjs\.org\/zh-cn\/faq\/customPlugin_99 \]/)
          .end()
      );
    });

    it.skip('should remove error listener after ready', async () => {
      app = cluster('apps/app-error-listeners');
      await app.ready();
      await app.httpRequest().get('/').expect({
        beforeReady: 1,
        afterReady: 1,
      });
      await app.close();
    });

    it('should ignore listen to other port', async () => {
      app = cluster('apps/other-port');
      // app.debug();
      await app.notExpect('stdout', /started at 7002/).end();
    });
  });
});
