import { strict as assert } from 'node:assert';
import mm, { MockApplication } from '../src/index.js';
import { getFixtures } from './helper.js';

describe('test/app.test.ts', () => {
  afterEach(mm.restore);

  // test mm.app
  call('app');
  // test mm.cluster
  call('cluster');

  it('should alias app.agent to app._agent', async () => {
    const baseDir = getFixtures('app');
    const app = mm.app({
      baseDir,
      // customEgg: path.join(__dirname, '../node_modules/egg'),
    });
    await app.ready();
    assert(app.agent === app._agent);
    assert(app.agent.app === app._app);
  });

  it('should not use cache when app is closed', async () => {
    const baseDir = getFixtures('app');
    const app1 = mm.app({
      baseDir,
      // customEgg: path.join(__dirname, '../node_modules/egg'),
    });
    await app1.ready();
    await app1.close();

    const app2 = mm.app({
      baseDir,
      // customEgg: path.join(__dirname, '../node_modules/egg'),
    });
    await app2.ready();
    await app2.close();

    assert(app1 !== app2);
  });

  it('should auto find framework when egg.framework exists on package.json', async () => {
    const baseDir = getFixtures('yadan_app');
    const app = mm.app({
      baseDir,
    });
    await app.ready();
    assert(app.config.foobar === 'yadan');
    await app.close();
  });

  it('should show fail tips when Agent not export by default', async () => {
    const baseDir = getFixtures('yadan_app_fail');
    const app = mm.app({
      baseDir,
    });
    await assert.rejects(app.ready(), /should export Agent class from framework/);
    await app.close();
  });

  it('should emit server event on app without superTest', async () => {
    const baseDir = getFixtures('server');
    const app = mm.app({
      baseDir,
    });
    await app.ready();
    assert(app.emitServer, 'app.emitServer not exists');
    assert(app.server, 'app.server not exists');
    await app.close();
  });

  it('support options.beforeInit', async () => {
    const baseDir = getFixtures('app');
    const app = mm.app({
      baseDir,
      // customEgg: path.join(__dirname, '../node_modules/egg'),
      cache: false,
      beforeInit(instance) {
        return new Promise(resolve => {
          setTimeout(() => {
            instance.options.test = 'abc';
            resolve();
          }, 100);
        });
      },
    });
    await app.ready();
    assert(!app.options.beforeInit);
    assert((app.options as any).test === 'abc');
  });

  it('should emit error when load Application fail', async () => {
    const baseDir = getFixtures('app-fail');
    const app = mm.app({ baseDir, cache: false });
    await assert.rejects(app.ready(), /load error/);
    await app.close();
  });

  it('should FrameworkErrorformater work during app boot', async () => {
    let logMsg = '';
    let catchErr: any;
    mm(process.stderr, 'write', (msg: string) => {
      logMsg = msg;
    });
    const app = mm.app({
      baseDir: getFixtures('app-boot-error'),
    });
    try {
      await app.ready();
    } catch (err) {
      catchErr = err;
    }

    assert.equal(catchErr.code, 'customPlugin_99');
    // console.log(catchErr);
    assert.match(logMsg, /CustomError: mock error/);
    // assert.match(logMsg, /framework\.CustomError\: mock error \[ https\:\/\/eggjs\.org\/zh-cn\/faq\/customPlugin_99 \]/);
  });

  it('should FrameworkErrorformater work during app boot ready', async () => {
    let logMsg: string = '';
    let catchErr: any;
    mm(process.stderr, 'write', (msg: string) => {
      logMsg = msg;
    });
    const app = mm.app({
      baseDir: getFixtures('app-boot-ready-error'),
    });
    try {
      await app.ready();
    } catch (err) {
      catchErr = err;
    }

    assert(catchErr.code === 'customPlugin_99');
    assert.match(logMsg, /CustomError: mock error/);
    // console.log(logMsg);
    assert(/framework\.CustomError\: mock error \[ https\:\/\/eggjs\.org\/zh-cn\/faq\/customPlugin_99 \]/.test(logMsg));
  });
});

function call(method: string) {
  let app: MockApplication;
  describe(`mm.${method}()`, () => {
    before(done => {
      const baseDir = getFixtures('app');
      mm(process, 'cwd', () => baseDir);
      app = (mm as any)[method]({
        cache: false,
        coverage: false,
      });
      app.ready(done);
    });
    after(() => app.close());

    it('should work', done => {
      app.httpRequest()
        .get('/')
        .expect('foo')
        .expect(200, done);
    });

    it('should emit server event on app', () => {
      return app.httpRequest()
        .get('/keepAliveTimeout')
        .expect(200)
        .expect({
          keepAliveTimeout: 5000,
        });
    });

    it('should app.expectLog(), app.notExpectLog() work', async () => {
      await app.httpRequest()
        .get('/logger')
        .expect(200)
        .expect({
          ok: true,
        });
      app.expectLog('[app.expectLog() test] ok');
      app.expectLog('[app.expectLog() test] ok', 'logger');
      app.expectLog('[app.expectLog(coreLogger) test] ok', 'coreLogger');

      app.notExpectLog('[app.notExpectLog() test] fail');
      app.notExpectLog('[app.notExpectLog() test] fail', 'logger');
      app.notExpectLog('[app.notExpectLog(coreLogger) test] fail', 'coreLogger');

      if (method === 'app') {
        app.expectLog(/\[app\.expectLog\(\) test\] ok/);
        app.expectLog(/\[app\.expectLog\(\) test\] ok/, app.logger);
        app.expectLog('[app.expectLog(coreLogger) test] ok', app.coreLogger);
        app.expectLog(/\[app\.expectLog\(coreLogger\) test\] ok/, 'coreLogger');

        app.notExpectLog(/\[app\.notExpectLog\(\) test\] fail/);
        app.notExpectLog(/\[app\.notExpectLog\(\) test\] fail/, app.logger);
        app.notExpectLog('[app.notExpectLog(coreLogger) test] fail', app.coreLogger);
        app.notExpectLog(/\[app\.notExpectLog\(coreLogger\) test\] fail/, 'coreLogger');
      }

      try {
        app.expectLog('[app.expectLog(coreLogger) test] ok');
        throw new Error('should not run this');
      } catch (err: any) {
        assert(err.message.includes('Can\'t find String:"[app.expectLog(coreLogger) test] ok" in '));
        assert(err.message.includes('app-web.log'));
      }

      try {
        app.notExpectLog('[app.expectLog() test] ok');
        throw new Error('should not run this');
      } catch (err: any) {
        assert(err.message.includes('Find String:"[app.expectLog() test] ok" in '));
        assert(err.message.includes('app-web.log'));
      }
    });

    it('should app.mockLog() then app.expectLog() work', async () => {
      app.mockLog();
      app.mockLog('logger');
      app.mockLog('coreLogger');
      await app.httpRequest()
        .get('/logger')
        .expect(200)
        .expect({
          ok: true,
        });
      app.expectLog('[app.expectLog() test] ok');
      app.expectLog('[app.expectLog() test] ok', 'logger');
      app.expectLog('[app.expectLog(coreLogger) test] ok', 'coreLogger');

      app.notExpectLog('[app.notExpectLog() test] fail');
      app.notExpectLog('[app.notExpectLog() test] fail', 'logger');
      app.notExpectLog('[app.notExpectLog(coreLogger) test] fail', 'coreLogger');

      if (method === 'app') {
        app.expectLog(/\[app\.expectLog\(\) test\] ok/);
        app.expectLog(/\[app\.expectLog\(\) test\] ok/, app.logger);
        app.expectLog('[app.expectLog(coreLogger) test] ok', app.coreLogger);
        app.expectLog(/\[app\.expectLog\(coreLogger\) test\] ok/, 'coreLogger');

        app.notExpectLog(/\[app\.notExpectLog\(\) test\] fail/);
        app.notExpectLog(/\[app\.notExpectLog\(\) test\] fail/, app.logger);
        app.notExpectLog('[app.notExpectLog(coreLogger) test] fail', app.coreLogger);
        app.notExpectLog(/\[app\.notExpectLog\(coreLogger\) test\] fail/, 'coreLogger');
      }

      try {
        app.expectLog('[app.expectLog(coreLogger) test] ok');
        throw new Error('should not run this');
      } catch (err: any) {
        assert(err.message.includes('Can\'t find String:"[app.expectLog(coreLogger) test] ok" in '));
        assert(err.message.includes('app-web.log'));
      }

      try {
        app.notExpectLog('[app.expectLog() test] ok');
        throw new Error('should not run this');
      } catch (err: any) {
        assert(err.message.includes('Find String:"[app.expectLog() test] ok" in '));
        assert(err.message.includes('app-web.log'));
      }

      if (method === 'app') {
        assert('_mockLogs' in app.logger && app.logger._mockLogs);
        assert('_mockLogs' in app.coreLogger && app.coreLogger._mockLogs);
        await mm.restore();
        assert(!app.logger._mockLogs);
        assert(!app.coreLogger._mockLogs);
      }
    });

    it('should app.mockLog() don\'t read from file', async () => {
      await app.httpRequest()
        .get('/logger')
        .expect(200)
        .expect({
          ok: true,
        });
      app.expectLog('INFO');
      app.mockLog();
      app.notExpectLog('INFO');
    });

    it('should request with ua', async () => {
      await app.httpRequest()
        .get('/ua')
        .expect(200)
        .expect(/@eggjs\/mock\/\d+\.\d+\.\d+/);
    });
  });

  describe(`mm.${method}({ baseDir, plugin=string })`, () => {
    const pluginDir = getFixtures('fooPlugin');
    before(done => {
      mm(process, 'cwd', () => pluginDir);
      app = (mm as any)[method]({
        baseDir: getFixtures('apps/foo'),
        plugin: 'fooPlugin',
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
          fooPlugin: true,
        })
        .expect(200, done);
    });
  });

  describe(`mm.${method}({ baseDir, plugin=true })`, () => {
    const pluginDir = getFixtures('fooPlugin');
    before(done => {
      mm(process, 'cwd', () => pluginDir);
      app = (mm as any)[method]({
        baseDir: getFixtures('apps/foo'),
        plugin: true,
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
          fooPlugin: true,
        })
        .expect(200, done);
    });
  });

  describe(`mm.${method}({ baseDir, plugins })`, () => {
    before(done => {
      app = (mm as any)[method]({
        baseDir: getFixtures('apps/foo'),
        plugins: {
          fooPlugin: {
            enable: true,
            path: getFixtures('fooPlugin'),
          },
        },
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
          fooPlugin: true,
        })
        .expect(200, done);
    });
  });

  describe(`mm.${method}({ baseDir, framework=fullpath })`, () => {
    before(done => {
      app = (mm as any)[method]({
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

  describe(`mm.${method}({ baseDir, customEgg=true })`, () => {
    before(done => {
      mm(process, 'cwd', () => {
        return getFixtures('bar');
      });
      app = (mm as any)[method]({
        baseDir: getFixtures('apps/barapp'),
        customEgg: true,
        cache: false,
        coverage: false,
      });
      app.ready(done);
    });
    after(() => app && app.close());

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

  describe(`mm.${method}({ baseDir, framework=true })`, () => {
    before(done => {
      mm(process, 'cwd', () => {
        return getFixtures('bar');
      });
      app = (mm as any)[method]({
        baseDir: getFixtures('apps/barapp'),
        framework: true,
        cache: false,
        coverage: false,
      });
      app.ready(done);
    });
    after(() => app && app.close());

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

  describe(`mm.${method}({ baseDir, cache=true })`, () => {
    let app1: MockApplication;
    let app2: MockApplication;
    before(done => {
      app1 = (mm as any)[method]({
        baseDir: getFixtures('cache'),
        coverage: false,
      });
      app1.ready(done);
    });
    before(done => {
      app2 = (mm as any)[method]({
        baseDir: getFixtures('cache'),
        coverage: false,
      });
      app2.ready(done);
    });
    after(async () => {
      await app1.close();
      await app2.close();
    });

    it('should equal', () => {
      assert(app1 === app2);
    });
  });
}
