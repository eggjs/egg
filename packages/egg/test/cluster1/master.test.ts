import { scheduler } from 'node:timers/promises';

import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';
import { mm } from '@eggjs/mock';
import coffee, { Coffee } from 'coffee';

import { type MockApplication, cluster, getFilepath } from '../utils.ts';

describe('test/cluster1/master.test.ts', () => {
  afterEach(mm.restore);

  describe('Master started log', () => {
    let app: MockApplication;

    afterEach(() => app.close());

    it('should dev env stdout message include "Egg started"', async () => {
      app = cluster('apps/master-worker-started');
      await app.expect('stdout', /Egg started/).ready();
    });

    it('should production env stdout message include "Egg started"', async () => {
      mm.env('prod');
      mm.consoleLevel('NONE');
      mm.home(getFilepath('apps/mock-production-app/config'));
      app = cluster('apps/mock-production-app');
      await app.expect('stdout', /Egg started/).ready();
    });
  });

  describe.skip('--cluster', () => {
    let app: MockApplication;
    beforeAll(async () => {
      mm.consoleLevel('NONE');
      app = cluster('apps/cluster_mod_app');
      await app.ready();
    });
    afterAll(() => app.close());

    it('should online cluster mode startup success', async () => {
      await app.httpRequest().get('/').expect('hi cluster').expect(200);
    });

    it('should assign a free port by master', async () => {
      await app.httpRequest().get('/clusterPort').expect(/\d+/).expect(200);
    });
  });

  describe.skip('--dev', () => {
    let app: MockApplication;
    beforeAll(async () => {
      app = cluster('apps/cluster_mod_app');
      await app.ready();
    });
    afterAll(() => app.close());

    it('should dev cluster mode startup success', async () => {
      await app.httpRequest().get('/').expect('hi cluster').expect(200);
    });
  });

  describe.skip('multi-application in one server', () => {
    let app1: MockApplication;
    let app2: MockApplication;
    beforeAll(async () => {
      // mm.consoleLevel('NONE');
      app1 = cluster('apps/cluster_mod_app');
      await app1.ready();
      app2 = cluster('apps/cluster_mod_app');
      await app2.ready();
      await scheduler.wait(2000);
    });
    afterAll(async () => {
      await Promise.all([app1.close(), app2.close()]);
    });

    it('should online cluster mode startup success, app1', async () => {
      await app1.httpRequest().get('/').expect('hi cluster').expect(200);
    });

    it.skip('should assign a free port by master, app1', async () => {
      await app1.httpRequest().get('/clusterPort').expect(/\d+/).expect(200);
    });

    it.skip('should online cluster mode startup success, app2', async () => {
      await app2.httpRequest().get('/').expect('hi cluster').expect(200);
    });

    it.skip('should assign a free port by master, app2', async () => {
      await app2.httpRequest().get('/clusterPort').expect(/\d+/).expect(200);
    });
  });

  describe.skip('start app with custom env', () => {
    describe('cluster mode, env: prod', () => {
      let app: MockApplication;
      beforeAll(async () => {
        mm.env('prod');
        mm.home(getFilepath('apps/custom-env-app'));
        app = cluster('apps/custom-env-app');
        await app.ready();
      });
      afterAll(() => app.close());

      it('should start with prod env', async () => {
        await app
          .httpRequest()
          .get('/')
          .expect({
            env: 'prod',
          })
          .expect(200);
      });
    });
  });

  describe.skip('framework start', () => {
    let app: MockApplication;
    beforeAll(async () => {
      // dependencies relation:
      // aliyun-egg-app -> aliyun-egg-biz -> aliyun-egg -> egg
      mm.home(getFilepath('apps/aliyun-egg-app'));
      app = cluster('apps/aliyun-egg-app', {
        customEgg: getFilepath('apps/aliyun-egg-biz'),
      });
      await app.ready();
    });
    afterAll(() => app.close());

    it('should start success', async () => {
      await app
        .httpRequest()
        .get('/')
        .expect({
          'aliyun-egg-core': true,
          'aliyun-egg-plugin': true,
          'aliyun-egg-agent': true,
        })
        .expect(200);
    });
  });

  describe.skip('spawn start', () => {
    let app: Coffee;
    afterEach(() => {
      // make sure process exit
      app && (app as any).proc.kill('SIGTERM');
    });

    it('should not cause master die when agent start error', async () => {
      app = coffee.spawn('node', [getFilepath('apps/agent-die/start.js')]);

      // spawn can't communication, so `end` event won't emit
      await scheduler.wait(10000);
      app.emit('close', 0);
      app.notExpect('stderr', /TypeError: process\.send is not a function/);
    });

    it.skip('should start without customEgg', async () => {
      app = coffee.fork(getFilepath('apps/master-worker-started/dispatch.js'));

      await scheduler.wait(10000);
      app.emit('close', 0);
      app.expect('stdout', /agent_worker#1:\d+ started /);
    });

    it.skip('should start without customEgg and worker_threads', async () => {
      app = coffee.fork(getFilepath('apps/master-worker-started-worker_threads/dispatch.js')).debug();

      await scheduler.wait(10000);
      app.emit('close', 0);
      app.expect('stdout', /agent_worker#1:\d+ started /);
      app.expect('stdout', /"startMode":"worker_threads"/);
    });
  });
});
