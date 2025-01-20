import { scheduler } from 'node:timers/promises';
import { mm } from '@eggjs/mock';
import { MockApplication, cluster } from '../utils.js';

describe('test/cluster2/master.test.ts', () => {
  afterEach(mm.restore);

  describe('app worker die', () => {
    let app: MockApplication;
    before(() => {
      mm.env('default');
      app = cluster('apps/app-die');
      app.coverage(false);
      return app.ready();
    });
    after(() => app.close());

    it('should restart after app worker exit', async () => {
      try {
        await app.httpRequest()
          .get('/exit');
      } catch (_) {
        // do nothing
      }

      // wait for app worker restart
      await scheduler.wait(20000);

      // error pipe to console
      app.expect('stdout', /app_worker#1:\d+ disconnect/);
      app.expect('stderr', /nodejs\.AppWorkerDiedError: \[master]/);
      app.expect('stderr', /app_worker#1:\d+ died/);
      app.expect('stdout', /app_worker#2:\d+ started/);
    });

    it('should restart when app worker throw uncaughtException', async () => {
      try {
        await app.httpRequest()
          .get('/uncaughtException');
      } catch (_) {
        // do nothing
      }

      // wait for app worker restart
      await scheduler.wait(20000);

      app.expect('stderr', /\[graceful:worker:\d+:uncaughtException] throw error 1 times/);
      app.expect('stdout', /app_worker#\d:\d+ started/);
    });
  });

  describe('app worker should not die with matched serverGracefulIgnoreCode', () => {
    let app: MockApplication;
    before(() => {
      mm.env('default');
      app = cluster('apps/app-die-ignore-code');
      app.coverage(false);
      return app.ready();
    });
    after(() => app.close());

    it('should not restart when matched uncaughtException happened', async () => {
      try {
        await app.httpRequest()
          .get('/uncaughtException');
      } catch (_) {
        // do nothing
      }

      // wait for app worker restart
      await scheduler.wait(5000);

      // error pipe to console
      app.notExpect('stdout', /app_worker#1:\d+ disconnect/);
    });

    it('should still log uncaughtException when matched uncaughtException happened', async () => {
      try {
        await app.httpRequest()
          .get('/uncaughtException');
      } catch (_) {
        // do nothing
      }

      // wait for app worker restart
      await scheduler.wait(5000);

      app.expect('stderr', /\[graceful:worker:\d+:uncaughtException] throw error 1 times/);
      app.expect('stderr', /matches ignore list/);
      app.notExpect('stdout', /app_worker#1:\d+ disconnect/);
    });
  });

  describe('Master start fail', () => {
    let master: MockApplication;

    after(() => master.close());

    it('should master exit with 1', done => {
      mm.consoleLevel('NONE');
      master = cluster('apps/worker-die');
      master.coverage(false);
      master.expect('code', 1).ready(done);
    });
  });
});
