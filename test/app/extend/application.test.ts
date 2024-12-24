
import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { scheduler } from 'node:timers/promises';
import { createApp, MockApplication, cluster } from '../../utils.js';

describe('test/app/extend/application.test.ts', () => {
  describe('app.logger', () => {
    let app: MockApplication;
    before(() => {
      app = createApp('apps/demo');
      return app.ready();
    });
    after(() => app.close());

    it('should alias app.logger => app.loggers.logger', () => {
      assert(app.logger === app.loggers.logger);
    });

    it('should alias app.coreLogger => app.loggers.coreLogger', () => {
      assert(app.coreLogger === app.loggers.coreLogger);
    });

    it('should alias app.getLogger(\'coreLogger\') => app.loggers.coreLogger', () => {
      assert(app.getLogger('coreLogger') === app.loggers.coreLogger);
    });

    it('should alias app.getLogger(\'noExist\') => null', () => {
      assert(app.getLogger('noExist') === null);
    });
  });

  describe('app.inspect()', () => {
    let app: MockApplication;
    before(() => {
      app = createApp('apps/demo');
      return app.ready();
    });
    after(() => app.close());

    it('should inspect app properties', () => {
      assert([
        'name', 'baseDir',
        'env', 'subdomainOffset',
        'controller', 'middlewares', 'serviceClasses',
        'config', 'httpclient', 'loggers',
      ].every(p => Object.prototype.hasOwnProperty.call(app.inspect(), p)));
      assert(app.inspect().name === 'demo');
    });
  });

  describe('app.readyCallback()', () => {
    let app: MockApplication;
    after(() => app.close());

    it('should log info when plugin is not ready', async () => {
      app = cluster('apps/notready');
      // it won't be ready, so wait for the timeout
      await scheduler.wait(11000);

      app.expect('stderr', /\[egg:core:ready_timeout] 10 seconds later a was still unable to finish./);
    });
  });

  describe('app.locals', () => {
    let app: MockApplication;
    before(() => {
      app = createApp('apps/locals');
      return app.ready();
    });
    after(() => app.close());

    it('should app.locals is same ref', () => {
      return app.httpRequest()
        .get('/app_same_ref')
        .expect('true');
    });

    it('should app.locals not OOM', () => {
      return app.httpRequest()
        .get('/app_locals_oom')
        .expect('ok');
    });
  });

  describe('app.locals.foo = bar', () => {
    let app: MockApplication;
    before(() => {
      app = createApp('apps/app-locals-getter');
      return app.ready();
    });
    after(() => app.close());

    it('should work', async () => {
      return await app.httpRequest()
        .get('/test')
        .expect({
          locals: {
            foo: 'bar',
            abc: '123',
          },
        });
    });
  });

  describe('app.createAnonymousContext()', () => {
    let app: MockApplication;
    before(() => {
      app = createApp('apps/demo');
      return app.ready();
    });
    after(() => app.close());

    it('should get anonymous context object', async () => {
      const ctx = app.createAnonymousContext({
        socket: {
          remoteAddress: '10.0.0.1',
        },
        headers: {
          'x-forwarded-for': '10.0.0.1',
        },
        url: '/foobar?ok=1',
      } as any);
      assert(ctx.ip === '10.0.0.1');
      assert(ctx.url === '/foobar?ok=1');
      assert(ctx.socket.remoteAddress === '10.0.0.1');
      assert(ctx.socket.remotePort === 7001);
    });
  });

  describe('app.addSingleton()', () => {
    let app: MockApplication;
    before(() => {
      app = createApp('apps/singleton-demo');
      return app.ready();
    });
    after(() => app.close());

    it('should add singleton success', async () => {
      let config = await app.dataService.get('first').getConfig();
      assert(config.foo === 'bar');
      assert(config.foo1 === 'bar1');

      const ds = app.dataService.createInstance({ foo: 'barrr' });
      config = await ds.getConfig();
      assert(config.foo === 'barrr');

      const ds2 = await app.dataService.createInstanceAsync({ foo: 'barrr' });
      config = await ds2.getConfig();
      assert(config.foo === 'barrr');

      config = await app.dataServiceAsync.get('first').getConfig();
      assert(config.foo === 'bar');
      assert(config.foo1 === 'bar1');

      try {
        app.dataServiceAsync.createInstance({ foo: 'barrr' });
        throw new Error('should not execute');
      } catch (err: any) {
        assert(err.message === 'egg:singleton dataServiceAsync only support create asynchronous, please use createInstanceAsync');
      }

      const ds4 = await app.dataServiceAsync.createInstanceAsync({ foo: 'barrr' });
      config = await ds4.getConfig();
      assert(config.foo === 'barrr');
    });
  });

  describe('app.runInBackground(scope)', () => {
    let app: MockApplication;
    before(() => {
      app = createApp('apps/ctx-background');
      return app.ready();
    });
    after(() => app.close());

    it('should run background task success', async () => {
      await app.httpRequest()
        .get('/app_background')
        .expect(200)
        .expect('hello app');
      await scheduler.wait(2100);
      const logdir = app.config.logger.dir;
      const log = fs.readFileSync(path.join(logdir, 'ctx-background-web.log'), 'utf8');
      assert(/mock background run at app result file size: \d+/.test(log));
      assert(/mock background run at app anonymous result file size: \d+/.test(log));
      assert(
        /\[egg:background] task:.*?app[\/\\]controller[\/\\]app\.js:\d+:\d+ success \([\d\.]+ms\)/.test(fs.readFileSync(path.join(logdir, 'egg-web.log'), 'utf8')),
      );
    });
  });

  describe('app.runInAnonymousContextScope(scope)', () => {
    it('should run task in anonymous context scope success', async () => {
      const app = createApp('apps/app-runInAnonymousContextScope');
      await app.ready();
      await app.close();
      await scheduler.wait(2100);
      const logdir = app.config.logger.dir;
      const logs = fs.readFileSync(path.join(logdir, 'app-runInAnonymousContextScope-web.log'), 'utf8').split('\n');
      // console.log(logs);
      // 2022-12-15 23:00:08,551 INFO 86728 [-/127.0.0.1/-/1ms GET /] before close on ctx logger
      // 2022-12-15 23:00:08,551 INFO 86728 [-/127.0.0.1/-/1ms GET /] before close on app logger
      // 2022-12-15 23:03:16,086 INFO 89216 outside before close on app logger
      assert.match(logs[0], / INFO \d+ \[-\/127.0.0.1\/-\/[\d\.]+ms GET \/] inside before close on ctx logger/);
      assert.match(logs[1], / INFO \d+ \[-\/127.0.0.1\/-\/[\d\.]+ms GET \/] inside before close on app logger/);
      assert.match(logs[2], / INFO \d+ outside before close on app logger/);
    });
  });

  describe('app.runInAnonymousContextScope(scope,request)', () => {
    it('should run task in anonymous context scope with req success', async () => {
      const app = createApp('apps/app-runInAnonymousContextScope-withRequest');
      await app.ready();
      await app.close();
      await scheduler.wait(2100);
      const logdir = app.config.logger.dir;
      const logs = fs.readFileSync(path.join(logdir, 'app-runInAnonymousContextScope-withRequest-web.log'), { encoding: 'utf8' }).split('\n');

      assert.match(logs[0], / INFO \d+ \[-\/127.0.0.2\/-\/[\d\.]+ms GET \/] inside before close on ctx logger/);
      assert.match(logs[1], / INFO \d+ \[-\/127.0.0.2\/-\/[\d\.]+ms GET \/] inside before close on app logger/);
      assert.match(logs[2], / INFO \d+ outside before close on app logger/);
    });
  });

  describe('app.handleRequest(ctx, fnMiddleware)', () => {
    let app: MockApplication;
    before(() => {
      app = createApp('apps/demo');
      return app.ready();
    });
    after(() => app.close());

    it('should wait for middleware resolution', async () => {
      const ctx = app.createAnonymousContext();
      await (app as any).handleRequest(ctx, async (ctx: any) => {
        await scheduler.wait(100);
        ctx.body = 'middleware resolution';
      });
      assert(ctx.body === 'middleware resolution');
    });
  });

  describe('app.keys', () => {
    let app: MockApplication;
    before(() => {
      app = createApp('apps/demo');
      return app.ready();
    });
    after(() => app.close());

    it('should work for app.keys and app.keys=', async () => {
      assert.deepEqual(app.keys, [ 'foo' ]);
      // `app.keys=` will be ignored
      app.keys = undefined;
      assert.deepEqual(app.keys, [ 'foo' ]);
    });
  });
});
