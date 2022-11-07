const mm = require('egg-mock');
const coffee = require('coffee');
const utils = require('../../utils');

describe('test/lib/cluster/master.test.js', () => {
  afterEach(mm.restore);

  describe('app worker die', () => {
    let app;
    before(() => {
      mm.env('default');
      app = utils.cluster('apps/app-die');
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
      await utils.sleep(5000);

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
      await utils.sleep(5000);

      app.expect('stderr', /\[graceful:worker:\d+:uncaughtException] throw error 1 times/);
      app.expect('stdout', /app_worker#\d:\d+ started/);
    });
  });

  describe('app worker should not die with matched serverGracefulIgnoreCode', () => {
    let app;
    before(() => {
      mm.env('default');
      app = utils.cluster('apps/app-die-ignore-code');
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
      await utils.sleep(5000);

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
      await utils.sleep(5000);

      app.expect('stderr', /\[graceful:worker:\d+:uncaughtException] throw error 1 times/);
      app.expect('stderr', /matches ignore list/);
      app.notExpect('stdout', /app_worker#1:\d+ disconnect/);
    });
  });

  describe('Master start fail', () => {
    let master;

    after(() => master.close());

    it('should master exit with 1', done => {
      mm.consoleLevel('NONE');
      master = utils.cluster('apps/worker-die');
      master.coverage(false);
      master.expect('code', 1).ready(done);
    });
  });

  describe('Master started log', () => {
    let app;

    afterEach(() => app.close());

    it('should dev env stdout message include "Egg started"', done => {
      app = utils.cluster('apps/master-worker-started');
      app.coverage(false);
      app.expect('stdout', /Egg started/).ready(done);
    });

    it('should production env stdout message include "Egg started"', done => {
      mm.env('prod');
      mm.consoleLevel('NONE');
      mm.home(utils.getFilepath('apps/mock-production-app/config'));
      app = utils.cluster('apps/mock-production-app');
      app.coverage(true);
      app.expect('stdout', /Egg started/).ready(done);
    });
  });

  describe('--cluster', () => {
    let app;
    before(() => {
      mm.consoleLevel('NONE');
      app = utils.cluster('apps/cluster_mod_app');
      app.coverage(false);
      return app.ready();
    });
    after(() => app.close());

    it('should online cluster mode startup success', () => {
      return app.httpRequest()
        .get('/')
        .expect('hi cluster')
        .expect(200);
    });

    it('should assign a free port by master', () => {
      return app.httpRequest()
        .get('/clusterPort')
        .expect(/\d+/)
        .expect(200);
    });
  });

  describe('--dev', () => {
    let app;
    before(() => {
      app = utils.cluster('apps/cluster_mod_app');
      app.coverage(false);
      return app.ready();
    });
    after(() => app.close());

    it('should dev cluster mode startup success', () => {
      return app.httpRequest()
        .get('/')
        .expect('hi cluster')
        .expect(200);
    });
  });

  describe('multi-application in one server', () => {
    let app1;
    let app2;
    before(async () => {
      mm.consoleLevel('NONE');
      app1 = utils.cluster('apps/cluster_mod_app');
      app1.coverage(false);
      app2 = utils.cluster('apps/cluster_mod_app');
      app2.coverage(false);
      await Promise.all([
        app1.ready(),
        app2.ready(),
      ]);
    });
    after(async () => {
      await Promise.all([
        app1.close(),
        app2.close(),
      ]);
    });

    it('should online cluster mode startup success, app1', () => {
      return app1.httpRequest()
        .get('/')
        .expect('hi cluster')
        .expect(200);
    });

    it('should assign a free port by master, app1', () => {
      return app1.httpRequest()
        .get('/clusterPort')
        .expect(/\d+/)
        .expect(200);
    });

    it('should online cluster mode startup success, app2', () => {
      return app2.httpRequest()
        .get('/')
        .expect('hi cluster')
        .expect(200);
    });

    it('should assign a free port by master, app2', () => {
      return app2.httpRequest()
        .get('/clusterPort')
        .expect(/\d+/)
        .expect(200);
    });
  });

  describe('start app with custom env', () => {
    describe('cluster mode, env: prod', () => {
      let app;
      before(() => {
        mm.env('prod');
        mm.home(utils.getFilepath('apps/custom-env-app'));
        app = utils.cluster('apps/custom-env-app');
        app.coverage(false);
        return app.ready();
      });
      after(() => app.close());

      it('should start with prod env', () => {
        return app.httpRequest()
          .get('/')
          .expect({
            env: 'prod',
          })
          .expect(200);
      });
    });
  });

  describe('framework start', () => {
    let app;
    before(() => {
      // dependencies relation:
      // aliyun-egg-app -> aliyun-egg-biz -> aliyun-egg -> egg
      mm.home(utils.getFilepath('apps/aliyun-egg-app'));
      app = utils.cluster('apps/aliyun-egg-app', {
        customEgg: utils.getFilepath('apps/aliyun-egg-biz'),
      });
      app.coverage(false);
      return app.ready();
    });
    after(() => app.close());

    it('should start success', () => {
      return app.httpRequest()
        .get('/')
        .expect({
          'aliyun-egg-core': true,
          'aliyun-egg-plugin': true,
          'aliyun-egg-agent': true,
        })
        .expect(200);
    });
  });

  describe('spawn start', () => {
    let app;
    afterEach(() => {
      // make sure process exit
      app.proc.kill('SIGTERM');
    });

    it('should not cause master die when agent start error', done => {
      app = coffee.spawn('node', [ utils.getFilepath('apps/agent-die/start.js') ])
        .coverage(false);

      // spawn can't comunication, so `end` event won't emit
      setTimeout(() => {
        app.emit('close', 0);
        app.notExpect('stderr', /TypeError: process\.send is not a function/);
        done();
      }, 10000);
    });

    it('should start without customEgg', done => {
      app = coffee.fork(utils.getFilepath('apps/master-worker-started/dispatch.js'))
        // .debug()
        .coverage(false);

      setTimeout(() => {
        app.emit('close', 0);
        app.expect('stdout', /agent_worker#1:\d+ started /);
        done();
      }, 10000);
    });

    it('should start without customEgg and worker_threads', done => {
      app = coffee.fork(utils.getFilepath('apps/master-worker-started-worker_threads/dispatch.js'))
        .debug()
        .coverage(false);

      setTimeout(() => {
        app.emit('close', 0);
        app.expect('stdout', /agent_worker#1:\d+ started /);
        app.expect('stdout', /"startMode":"worker_threads"/);
        done();
      }, 10000);
    });
  });
});
