import { scheduler } from 'node:timers/promises';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterEach, beforeEach } from 'vitest';

import { cluster } from './utils.ts';

// node v24 will hang when test this file
// FIXME: should enable this test after node v24 is stable
describe.skipIf(process.version.startsWith('v24') || process.platform === 'win32')('test/app_worker.test.ts', () => {
  let app: MockApplication;
  afterEach(() => app && app.close());
  afterEach(mm.restore);

  describe('refork', () => {
    beforeEach(() => {
      mm.env('default');
    });

    it.skip('should refork when app_worker exit', async () => {
      app = cluster('apps/app-die');
      // app.debug();
      await app.ready();

      await app.httpRequest().get('/exit').expect(200);

      await scheduler.wait(10000);

      app.expect('stdout', /app_worker#1:\d+ started at \d+/);
      app.expect('stderr', /new worker:\d+ fork/);
      app.expect('stdout', /app_worker#1:\d+ disconnect/);
      app.expect('stdout', /app_worker#2:\d+ started at \d+/);

      await app.httpRequest().get('/exit').expect(200);

      await scheduler.wait(10000);

      app.expect('stdout', /app_worker#3:\d+ started at \d+/);
      await app.close();
    });

    it('should not refork when starting', async () => {
      app = cluster('apps/app-start-error');
      // app.debug();
      await app.ready();

      app.expect('stdout', /don't fork/);
      app.expect('stderr', /app_worker#1:\d+ start fail/);
      app.expect('code', 1);

      await app.close();
    });
  });
});
