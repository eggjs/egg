import { mm } from '@eggjs/mock';
import coffee, { Coffee } from 'coffee';
import { MockApplication, cluster, getFilepath } from '../utils.js';

describe('test/cluster1/master.test.ts', () => {
  afterEach(mm.restore);

  describe('Master started log', () => {
    let app: MockApplication;

    afterEach(() => app.close());

    it('should dev env stdout message include "Egg started"', done => {
      app = cluster('apps/master-worker-started');
      app.coverage(false);
      app.expect('stdout', /Egg started/).ready(done);
    });

    it('should production env stdout message include "Egg started"', done => {
      mm.env('prod');
      mm.consoleLevel('NONE');
      mm.home(getFilepath('apps/mock-production-app/config'));
      app = cluster('apps/mock-production-app');
      app.coverage(true);
      app.expect('stdout', /Egg started/).ready(done);
    });
  });

  describe('--cluster', () => {
    let app: MockApplication;
    before(() => {
      mm.consoleLevel('NONE');
      app = cluster('apps/cluster_mod_app');
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
    let app: MockApplication;
    before(() => {
      app = cluster('apps/cluster_mod_app');
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
    let app1: MockApplication;
    let app2: MockApplication;
    before(async () => {
      // mm.consoleLevel('NONE');
      app1 = cluster('apps/cluster_mod_app');
      app1.coverage(false);
      app2 = cluster('apps/cluster_mod_app');
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
      let app: MockApplication;
      before(() => {
        mm.env('prod');
        mm.home(getFilepath('apps/custom-env-app'));
        app = cluster('apps/custom-env-app');
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

  describe.skip('framework start', () => {
    let app: MockApplication;
    before(() => {
      // dependencies relation:
      // aliyun-egg-app -> aliyun-egg-biz -> aliyun-egg -> egg
      mm.home(getFilepath('apps/aliyun-egg-app'));
      app = cluster('apps/aliyun-egg-app', {
        customEgg: getFilepath('apps/aliyun-egg-biz'),
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
    let app: Coffee;
    afterEach(() => {
      // make sure process exit
      (app as any).proc.kill('SIGTERM');
    });

    it('should not cause master die when agent start error', done => {
      app = coffee.spawn('node', [ getFilepath('apps/agent-die/start.js') ]);

      // spawn can't communication, so `end` event won't emit
      setTimeout(() => {
        app.emit('close', 0);
        app.notExpect('stderr', /TypeError: process\.send is not a function/);
        done();
      }, 10000);
    });

    it.skip('should start without customEgg', done => {
      app = coffee.fork(getFilepath('apps/master-worker-started/dispatch.js'));

      setTimeout(() => {
        app.emit('close', 0);
        app.expect('stdout', /agent_worker#1:\d+ started /);
        done();
      }, 10000);
    });

    it.skip('should start without customEgg and worker_threads', done => {
      app = coffee.fork(getFilepath('apps/master-worker-started-worker_threads/dispatch.js'))
        .debug();

      setTimeout(() => {
        app.emit('close', 0);
        app.expect('stdout', /agent_worker#1:\d+ started /);
        app.expect('stdout', /"startMode":"worker_threads"/);
        done();
      }, 10000);
    });
  });
});
