import { strict as assert } from 'node:assert';
import { getFixtures } from './helper.js';
import mm, { MockApplication } from '../src/index.js';

describe('test/cluster.test.ts', () => {
  afterEach(mm.restore);

  describe('normal', () => {
    let app: MockApplication;
    before(() => {
      app = mm.cluster({
        baseDir: getFixtures('demo'),
        cache: false,
        coverage: false,
      });
      // app.debug();
      return app.ready();
    });
    after(() => app.close());

    it('should have members', async () => {
      assert.equal(app.callback(), app);
      assert.equal(app.listen(), app);
      await app.ready();
      assert(app.process);
    });

    it('should throw error when mock function not exists', () => {
      assert.throws(() => {
        app.mockNotExists();
      }, /method "mockNotExists" not exists on app/);
    });

    it('should listen on port', () => {
      app.expect('stdout', /egg started on http:\/\/127.0.0.1:17\d{3}/);
    });
  });

  describe('work on startMode=worker_threads', () => {
    let app: MockApplication;
    before(() => {
      app = mm.cluster({
        baseDir: getFixtures('demo'),
        cache: false,
        coverage: false,
        startMode: 'worker_threads',
      });
      // app.debug();
      return app.ready();
    });
    after(() => app.close());

    it('should have members', async () => {
      assert.equal(app.callback(), app);
      assert.equal(app.listen(), app);
      await app.ready();
      assert(app.process);
    });

    it('should listen on port', () => {
      app.expect('stdout', /egg started on http:\/\/127.0.0.1:17\d{3}/);
    });
  });

  describe('cluster with fullpath baseDir', () => {
    let app: MockApplication;
    before(done => {
      app = mm.cluster({
        baseDir: getFixtures('demo'),
        cache: false,
        coverage: false,
      });
      app.ready(done);
    });
    after(() => app.close());

    it('should work', done => {
      app.httpRequest()
        .get('/hello')
        .expect('hi')
        .expect(200, done);
    });
  });

  describe('cluster with shortpath baseDir', () => {
    let app: MockApplication;
    before(done => {
      app = mm.cluster({
        baseDir: 'demo',
        cache: false,
        coverage: false,
      });
      app.ready(done);
    });
    after(() => app.close());

    it('should work', done => {
      app.httpRequest()
        .get('/hello')
        .expect('hi')
        .expect(200, done);
    });
  });

  describe('cluster with customEgg=string', () => {
    let app: MockApplication;
    before(done => {
      app = mm.cluster({
        baseDir: 'apps/barapp',
        customEgg: getFixtures('bar'),
        cache: false,
        coverage: false,
      });
      app.ready(done);
    });
    after(() => app.close());

    it('should work', done => {
      app.httpRequest()
        .get('/')
        .expect({
          foo: 'bar',
          foobar: 'bar',
        })
        .expect(200, done);
    });
  });

  describe('cluster with framework=string', () => {
    let app: MockApplication;
    before(done => {
      app = mm.cluster({
        baseDir: 'apps/barapp',
        framework: getFixtures('bar'),
        cache: false,
        coverage: false,
      });
      app.ready(done);
    });
    after(() => app.close());

    it('should work', done => {
      app.httpRequest()
        .get('/')
        .expect({
          foo: 'bar',
          foobar: 'bar',
        })
        .expect(200, done);
    });
  });

  describe('cluster with customEgg=true', () => {
    let app: MockApplication;
    before(done => {
      mm(process, 'cwd', () => {
        return getFixtures('bar');
      });
      app = mm.cluster({
        baseDir: getFixtures('apps/barapp'),
        customEgg: true,
        cache: false,
        coverage: false,
      });
      app.ready(done);
    });
    after(() => app.close());

    it('should work', done => {
      app.httpRequest()
        .get('/')
        .expect({
          foo: 'bar',
          foobar: 'bar',
        })
        .expect(200, done);
    });
  });

  describe('cluster with framework=true', () => {
    let app: MockApplication;
    before(done => {
      mm(process, 'cwd', () => {
        return getFixtures('bar');
      });
      app = mm.cluster({
        baseDir: getFixtures('apps/barapp'),
        framework: true,
        cache: false,
        coverage: false,
      });
      app.ready(done);
    });
    after(() => app.close());

    it('should work', done => {
      app.httpRequest()
        .get('/')
        .expect({
          foo: 'bar',
          foobar: 'bar',
        })
        .expect(200, done);
    });
  });

  describe('cluster with cache', () => {
    let app1: MockApplication;
    let app2: MockApplication;
    afterEach(() => {
      const promises = [];
      app1 && promises.push(app1.close());
      app2 && promises.push(app2.close());
      return Promise.all(promises);
    });

    it('should return cached cluster app', async () => {
      app1 = mm.cluster({
        baseDir: 'demo',
        coverage: false,
      });
      await app1.ready();

      app2 = mm.cluster({
        baseDir: 'demo',
        coverage: false,
      });
      await app2.ready();

      assert(app1 === app2);
    });

    it('should return new app if cached app has been closed', async () => {
      app1 = mm.cluster({
        baseDir: 'demo',
        coverage: false,
      });
      await app1.ready();
      await app1.close();

      app2 = mm.cluster({
        baseDir: 'demo',
        coverage: false,
      });
      await app2.ready();

      assert(app2 !== app1);
    });

  });

  describe('cluster with eggPath', () => {
    let app: MockApplication;
    after(() => app.close());

    it('should get eggPath', async () => {
      app = mm.cluster({
        baseDir: 'demo',
        customEgg: getFixtures('chair'),
        eggPath: '/path/to/eggPath',
        cache: false,
        coverage: false,
      } as any);
      await app
        .debug()
        .expect('stdout', /\/path\/to\/eggPath/)
        .end();
    });
  });

  describe('cluster with workers', () => {
    let app: MockApplication;
    after(() => app.close());

    it('should get 2 workers', async () => {
      app = mm.cluster({
        baseDir: 'demo',
        customEgg: getFixtures('chair'),
        workers: 2,
        cache: false,
        coverage: false,
      });
      app.debug();
      await app.expect('stdout', /app_worker#1:/)
        .expect('stdout', /app_worker#2:/)
        .end();
    });
  });

  describe('cluster with opts.customEgg', () => {
    let app: MockApplication;
    after(() => app.close());

    it('should pass execArgv', async () => {
      app = mm.cluster({
        baseDir: 'custom_egg',
        customEgg: getFixtures('bar'),
        workers: 1,
        cache: false,
        coverage: false,
        opt: {
          execArgv: [ '--inspect' ],
        },
      });
      // app.debug();
      await app.expect('stdout', /app_worker#1:/)
        .expect('stderr', /Debugger listening/)
        .end();
    });
  });

  describe('cluster with egg.framework=yadan', () => {
    let app: MockApplication;
    after(() => app.close());

    it('should pass execArgv', async () => {
      app = mm.cluster({
        baseDir: 'yadan_app',
        workers: 1,
        cache: false,
        coverage: false,
      });
      await app.expect('stdout', /app_worker#1:/)
        .end();
    });
  });

  describe.skip('prerequire', () => {
    let app: MockApplication;
    after(() => app.close());

    it('should load files', async () => {
      mm(process.env, 'EGG_BIN_PREREQUIRE', 'true');
      mm(process.env, 'NODE_DEBUG', 'egg-mock:prerequire');
      app = mm.cluster({
        baseDir: 'yadan_app',
        workers: 1,
        cache: false,
        coverage: false,
      });
      await app
        .expect('stderr', /prerequire .+?\/app\/extend\/application.js/)
        .expect('code', 0)
        .end();
    });
  });

  describe('custom port', () => {
    let app: MockApplication;
    after(() => app.close());

    it('should use it', async () => {
      app = mm.cluster({
        baseDir: getFixtures('demo'),
        cache: false,
        coverage: false,
        port: 5566,
      });
      // app.debug();
      await app.ready();

      app.expect('stdout', /egg started on http:\/\/127.0.0.1:5566/);
    });
  });
});
