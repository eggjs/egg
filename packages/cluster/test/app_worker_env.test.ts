import { scheduler } from 'node:timers/promises';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterEach, beforeAll, afterAll } from 'vitest';

import { cluster } from './utils.ts';

// node v24 will hang when test this file
// FIXME: should enable this test after node v24 is stable
describe.skipIf(process.version.startsWith('v24') || process.platform === 'win32')('test/app_worker.test.ts', () => {
  let app: MockApplication;
  afterEach(() => app && app.close());
  afterEach(mm.restore);

  describe.skip('app worker error in env === "default"', () => {
    beforeAll(async () => {
      mm.env('default');
      app = cluster('apps/app-die');
      // app.debug();
      await app.ready();
    });
    afterAll(async () => {
      await app.close();
      await mm.restore();
    });

    it('should restart', async () => {
      await app.httpRequest().get('/exit').expect(200);

      // wait app worker restart
      await scheduler.wait(5000);

      app.expect('stdout', /app_worker#1:\d+ disconnect/);
      app.expect('stdout', /app_worker#2:\d+ started/);
    });
  });

  describe.skip('app worker error when env === "local"', () => {
    beforeAll(() => {
      mm.env('local');
      app = cluster('apps/app-die');
      // app.debug();
      return app.ready();
    });
    afterAll(async () => {
      await app.close();
      await mm.restore();
    });

    it('should restart disable on local env', async () => {
      try {
        await app.httpRequest().get('/exit');
      } catch {
        // ignore
      }

      await scheduler.wait(3000);

      app.expect('stderr', /worker:\d+ disconnect/);
      app.expect('stderr', /don't fork new work \(refork: false, reforkCount: 0\)/);
    });
  });

  describe.skip('app worker kill when env === "local"', () => {
    beforeAll(async () => {
      mm.env('local');
      app = cluster('apps/app-kill');
      // app.debug();
      await app.ready();
    });
    afterAll(async () => {
      await app.close();
      await mm.restore();
    });

    it('should exit', async () => {
      try {
        await app.httpRequest().get('/kill?signal=SIGKILL');
      } catch {
        // ignore
      }

      // wait app worker restart
      await scheduler.wait(3000);

      app.expect('stderr', /worker:\d+ disconnect/);
      app.expect('stderr', /don't fork new work/);
    });
  });

  describe('app start timeout', () => {
    it('should exit', async () => {
      app = cluster('apps/app-start-timeout');
      await app
        // .debug()
        .expect('code', 1)
        .expect('stderr', /\[master\] app_worker#1:\d+ start fail, exiting with code:1/)
        .expect('stderr', /\[app_worker\] start timeout, exiting with code:1/)
        .expect('stderr', /nodejs.AppWorkerDiedError: \[master\]/)
        .expect('stderr', /app_worker#1:\d+ died/)
        .end();
    });
  });
});
