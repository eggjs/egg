'use strict';

const mm = require('egg-mock');
const request = require('supertest');
const coffee = require('coffee');
const sleep = require('ko-sleep');
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

    it('should restart after app worker exit', function* () {
      try {
        yield request(app.callback())
          .get('/exit');
      } catch (_) {
        // do nothing
      }

      // wait for app worker restart
      yield sleep(5000);

      // error pipe to console
      app.expect('stdout', /App Worker#1:\d+ disconnect/);
      app.expect('stderr', /nodejs\.AppWorkerDiedError: \[master]/);
      app.expect('stderr', /App Worker#1:\d+ died/);
      app.expect('stdout', /App Worker#2:\d+ started/);
    });

    it('should restart when app worker throw uncaughtException', function* () {
      try {
        yield request(app.callback())
          .get('/uncaughtException');
      } catch (_) {
        // do nothing
      }

      // wait for app worker restart
      yield sleep(5000);

      app.expect('stderr', /\[graceful:worker:\d+:uncaughtException] throw error 1 times/);
      app.expect('stdout', /App Worker#\d:\d+ started/);
    });
  });

  describe('Master start fail', () => {
    let master;

    after(() => master.close());

    it('should master exit with 1', done => {
      mm.consoleLevel('NONE');
      master = utils.cluster('apps/worker-die', { coverage: true });
      master.expect('code', 1).ready(done);
    });
  });

  describe('Master started log', () => {
    let app;

    afterEach(() => app.close());

    it('should dev env stdout message include "Egg started"', done => {
      app = utils.cluster('apps/master-worker-started', { coverage: true });
      app.expect('stdout', /Egg started/).ready(done);
    });

    it('should production env stdout message include "Egg started"', done => {
      mm.env('prod');
      mm.consoleLevel('NONE');
      mm.home(utils.getFilepath('apps/mock-production-app/config'));
      app = utils.cluster('apps/mock-production-app', { coverage: true });
      app.expect('stdout', /Egg started/).ready(done);
    });
  });

  describe('--cluster', () => {
    let app;
    before(() => {
      mm.consoleLevel('NONE');
      app = utils.cluster('apps/cluster_mod_app', { coverage: true });
      return app.ready();
    });
    after(() => app.close());

    it('should online cluster mode startup success', () => {
      return request(app.callback())
        .get('/')
        .expect('hi cluster')
        .expect(200);
    });

    it('should assign a free port by master', () => {
      return request(app.callback())
        .get('/clusterPort')
        .expect(/\d+/)
        .expect(200);
    });
  });

  describe('--dev', () => {
    let app;
    before(() => {
      app = utils.cluster('apps/cluster_mod_app', { coverage: true });
      return app.ready();
    });
    after(() => app.close());

    it('should dev cluster mode startup success', () => {
      return request(app)
        .get('/')
        .expect('hi cluster')
        .expect(200);
    });
  });

  describe('multi-application in one server', () => {
    let app1;
    let app2;
    before(function* () {
      mm.consoleLevel('NONE');
      app1 = utils.cluster('apps/cluster_mod_app', { coverage: true });
      app2 = utils.cluster('apps/cluster_mod_app', { coverage: true });
      yield [
        app1.ready(),
        app2.ready(),
      ];
    });
    after(() => {
      app1.close();
      app2.close();
    });

    it('should online cluster mode startup success, app1', () => {
      return request(app1.callback())
        .get('/')
        .expect('hi cluster')
        .expect(200);
    });

    it('should assign a free port by master, app1', () => {
      return request(app1.callback())
        .get('/clusterPort')
        .expect(/\d+/)
        .expect(200);
    });

    it('should online cluster mode startup success, app2', () => {
      return request(app2.callback())
        .get('/')
        .expect('hi cluster')
        .expect(200);
    });

    it('should assign a free port by master, app2', () => {
      return request(app2.callback())
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
        return app.ready();
      });
      after(() => app.close());

      it('should start with prod env', () => {
        return request(app.callback())
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
      return app.ready();
    });
    after(() => app.close());

    it('should start success', () => {
      return request(app.callback())
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
        app.expect('stdout', /Agent Worker started /);
        done();
      }, 10000);
    });
  });

});
