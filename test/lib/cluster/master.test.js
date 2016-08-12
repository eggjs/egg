'use strict';

const mm = require('egg-mock');
const request = require('supertest-as-promised');
const coffee = require('coffee');
const utils = require('../../utils');

describe('test/lib/cluster/master.test.js', () => {

  afterEach(mm.restore);

  describe('app worker die', () => {
    let app;
    before(() => {
      mm.env('default');
      app = utils.cluster('apps/app-die');
      app.debug();
      app.coverage(false);
      return app.ready();
    });
    after(() => app.close());

    it('should restart after app worker exit', done => {
      request(app.callback())
        .get('/exit')
        // wait for app worker restart
        .end(() => setTimeout(() => {
          // error pipe to console
          app.expect('stdout', /App Worker#1:\d+ disconnect/);
          app.expect('stderr', /nodejs\.AppWorkerDiedError: \[master\]/);
          app.expect('stderr', /App Worker#1:\d+ died/);
          app.expect('stdout', /App Worker#2:\d+ started/);

          done();
          // this will be slow on ci env
        }, 5000));
    });

    it('should restart when app worker throw uncaughtException', done => {
      request(app.callback())
        .get('/uncaughtException')
        // wait for app worker restart
        .end(() => setTimeout(() => {
          app.expect('stderr', /\[graceful:worker:\d+:uncaughtException\] throw error 1 times/);
          app.expect('stdout', /App Worker#\d:\d+ started/);
          done();
        }, 5000));
    });
  });

  describe('Master start fail', () => {
    let master;

    after(() => master.close());

    it('should master exit with 1', done => {
      mm(process.env, 'EGG_LOG', 'none');
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
      mm(process.env, 'HOME', utils.getFilepath('apps/mock-production-app/config'));
      app = utils.cluster('apps/mock-production-app', { coverage: true });
      app.expect('stdout', /Egg started/).ready(done);
    });
  });

  describe('--cluster', () => {
    let app;
    before(() => {
      mm(process.env, 'EGG_LOG', 'none');
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

  describe('start app with custom env', () => {
    describe('cluster mode, serverEnv: prod', () => {
      let app;
      before(() => {
        mm.env('prod');
        mm(process.env, 'HOME', utils.getFilepath('apps/custom-env-app'));
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
      mm(process.env, 'HOME', utils.getFilepath('apps/aliyun-egg-app'));
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
    after(() => {
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
  });

  describe.skip('close watcher and logrotator both', () => {
    let app;
    before(done => {
      mm.env('default');
      app = utils.cluster('apps/close-watcher-logrotator');
      app.ready(done);
    });

    after(() => app.close());

    it('agent should exit normal', () => {
      app.notExpect('stderr', /nodejs\.AgentWorkerDiedError/);
    });
  });
});
