import fs from 'node:fs';
import path from 'node:path';
import { strict as assert } from 'node:assert';
import { scheduler } from 'node:timers/promises';
import {
  createApp, restore, MockApplication, mm, getFilepath, singleProcessApp,
  startLocalServer,
} from '../../utils.js';

describe('test/app/extend/context.test.ts', () => {
  afterEach(restore);
  let app: MockApplication;

  describe('ctx.logger', () => {
    afterEach(() => app.close());

    it('env=local: level => info', async () => {
      mm.env('local');
      mm.consoleLevel('NONE');
      app = createApp('apps/demo', { cache: false });
      await app.ready();
      const logDir = app.config.logger.dir;

      await app.httpRequest()
        .get('/logger?message=foo')
        .expect('logger');

      await scheduler.wait(1200);

      const errorContent = fs.readFileSync(path.join(logDir, 'common-error.log'), 'utf8');
      assert(errorContent.includes('nodejs.Error: error foo'));
      assert(errorContent.includes('nodejs.Error: core error foo'));

      const loggerContent = fs.readFileSync(path.join(logDir, 'demo-web.log'), 'utf8');
      // loggerContent.should.containEql('debug foo');
      assert(loggerContent.includes('info foo'));
      assert(loggerContent.includes('warn foo'));

      const coreLoggerContent = fs.readFileSync(path.join(logDir, 'egg-web.log'), 'utf8');
      // coreLoggerContent.should.containEql('core debug foo');
      assert(coreLoggerContent.includes('core info foo'));
      assert(coreLoggerContent.includes('core warn foo'));
    });

    it('env=unittest: level => info', async () => {
      mm.env('unittest');
      mm.consoleLevel('NONE');
      app = createApp('apps/demo', { cache: false });
      await app.ready();
      const logDir = app.config.logger.dir;

      app.mockContext({
        userId: '123123',
      });

      await app.httpRequest()
        .get('/logger?message=foo')
        .expect('logger');

      await scheduler.wait(1200);

      const errorContent = fs.readFileSync(path.join(logDir, 'common-error.log'), 'utf8');
      assert(errorContent.includes('nodejs.Error: error foo'));
      assert(errorContent.includes('nodejs.Error: core error foo'));
      assert.match(errorContent, /\[123123\/[\d\.]+\/-\/[\d\.]+ms GET \/logger\?message=foo]/);

      const loggerContent = fs.readFileSync(path.join(logDir, 'demo-web.log'), 'utf8');
      assert(!loggerContent.includes('debug foo'));
      assert(loggerContent.includes('info foo'));
      assert(loggerContent.includes('warn foo'));

      const coreLoggerContent = fs.readFileSync(path.join(logDir, 'egg-web.log'), 'utf8');
      assert(!coreLoggerContent.includes('core debug foo'));
      assert(coreLoggerContent.includes('core info foo'));
      assert(coreLoggerContent.includes('core warn foo'));
    });

    it('env=prod: level => info', async () => {
      mm.env('unittest');
      mm.consoleLevel('NONE');
      app = createApp('apps/demo', { cache: false });
      await app.ready();
      const logDir = app.config.logger.dir;

      await app.httpRequest()
        .get('/logger?message=foo')
        .expect('logger');

      await scheduler.wait(2000);

      const errorContent = fs.readFileSync(path.join(logDir, 'common-error.log'), 'utf8');
      assert(errorContent.includes('nodejs.Error: error foo'));
      assert(errorContent.includes('nodejs.Error: core error foo'));

      const loggerContent = fs.readFileSync(path.join(logDir, 'demo-web.log'), 'utf8');
      assert(!loggerContent.includes('debug foo'));
      assert(loggerContent.includes('info foo'));
      assert(loggerContent.includes('warn foo'));

      const coreLoggerContent = fs.readFileSync(path.join(logDir, 'egg-web.log'), 'utf8');
      assert(!coreLoggerContent.includes('core debug foo'));
      assert(coreLoggerContent.includes('core info foo'));
      assert(coreLoggerContent.includes('core warn foo'));
    });
  });

  describe('ctx.getLogger', () => {
    before(() => {
      app = createApp('apps/get-logger');
      return app.ready();
    });
    after(() => app.close());

    it('should return null when logger is not found', () => {
      return app.httpRequest()
        .get('/noExistLogger')
        .expect('null');
    });

    it('should log with padding message', async () => {
      await app.httpRequest()
        .get('/logger')
        .expect(200);

      await scheduler.wait(100);
      const logPath = getFilepath('apps/get-logger/logs/get-logger/a.log');
      assert.match(
        fs.readFileSync(logPath, 'utf8'),
        /\[-\/127.0.0.1\/-\/[\d\.]+ms GET \/logger] aaa/,
      );
    });
  });

  describe('app or framework can override ctx.getLogger', () => {
    before(() => {
      app = createApp('apps/custom-context-getlogger');
      return app.ready();
    });
    after(() => app.close());

    it('should log with custom logger', () => {
      return app.httpRequest()
        .get('/')
        .expect('work, logger: exists');
    });
  });

  describe('agent anonymous context can be extended', () => {
    before(() => {
      app = createApp('apps/custom-context-getlogger');
      return app.ready();
    });
    after(() => app.close());

    it('should extend context as app', () => {
      const ctx = app.agent.createAnonymousContext();
      const logger = ctx.getLogger('foo');
      logger.info('hello');
    });
  });

  describe('properties', () => {
    before(() => {
      app = createApp('apps/context-config-app');
      return app.ready();
    });
    after(() => app.close());

    describe('ctx.router getter and setter', () => {
      it('should work', () => {
        return app.httpRequest()
          .get('/')
          .expect(200)
          .expect('{"path":"/","foo":1,"bar":2}');
      });
    });
  });

  describe('ctx.locals', () => {
    before(() => {
      app = createApp('apps/locals');
      return app.ready();
    });
    after(() => app.close());

    it('should same this.locals ref on every request ', () => {
      return app.httpRequest()
        .get('/ctx_same_ref')
        .expect('true');
    });

    it('should this.locals merge app.locals data', () => {
      return app.httpRequest()
        .get('/ctx_merge_app')
        .expect({
          a: 1,
          b: 1,
        });
    });

    it('should this.locals cover app.locals data', () => {
      return app.httpRequest()
        .get('/ctx_override_app')
        .expect({
          a: 'ctx.a',
          b: 'ctx.b',
        });
    });

    it('should not change this.locals data when app.locals change again', () => {
      return app.httpRequest()
        .get('/ctx_app_update_can_not_affect_ctx')
        .expect({
          a: 'app.a',
          b: 'app.b',
          newPropertyExists: false,
        });
    });

    it('should locals only support object format', () => {
      return app.httpRequest()
        .get('/set_only_support_object')
        .expect({
          'ctx.locals.object': true,
          'app.locals.object': true,
          'app.locals.string': false,
          'app.locals.number': false,
          'app.locals.function': false,
          'app.locals.array': false,
          'ctx.locals.string': false,
          'ctx.locals.number': false,
          'ctx.locals.function': false,
          'ctx.locals.array': false,
        });
    });
  });

  describe('ctx.runInBackground(scope)', () => {
    before(() => {
      app = createApp('apps/ctx-background');
      return app.ready();
    });
    after(() => app.close());

    it('should run background task success', async () => {
      await app.httpRequest()
        .get('/')
        .expect(200)
        .expect('hello');
      await app.backgroundTasksFinished();
      await scheduler.wait(100);
      const logDir = app.config.logger.dir;
      const log = fs.readFileSync(path.join(logDir, 'ctx-background-web.log'), 'utf8');
      assert(/background run result file size: \d+/.test(log));
      assert(/background run anonymous result file size: \d+/.test(log));
      assert(
        /\[egg:background] task:saveUserInfo success \([\d\.]+ms\)/.test(fs.readFileSync(path.join(logDir, 'egg-web.log'), 'utf8')),
      );
      assert(
        /\[egg:background] task:.*?app[\/\\]controller[\/\\]home\.js:\d+:\d+ success \([\d\.]+ms\)/.test(fs.readFileSync(path.join(logDir, 'egg-web.log'), 'utf8')),
      );
    });

    it('should use custom task name first', async () => {
      await app.httpRequest()
        .get('/custom')
        .expect(200)
        .expect('hello');
      await app.backgroundTasksFinished();
      await scheduler.wait(100);
      const logDir = app.config.logger.dir;
      const log = fs.readFileSync(path.join(logDir, 'ctx-background-web.log'), 'utf8');
      assert(/background run result file size: \d+/.test(log));
      assert(
        /\[egg:background] task:customTaskName success \([\d\.]+ms\)/.test(fs.readFileSync(path.join(logDir, 'egg-web.log'), 'utf8')),
      );
    });

    it('should run background task error', async () => {
      mm.consoleLevel('NONE');

      let errorHadEmit = false;
      app.on('error', (err: any, ctx: any) => {
        assert(err.runInBackground);
        assert(/ENOENT: no such file or directory/.test(err.message));
        assert(ctx);
        errorHadEmit = true;
      });
      await app.httpRequest()
        .get('/error')
        .expect(200)
        .expect('hello error');
      await app.backgroundTasksFinished();
      await scheduler.wait(100);
      assert(errorHadEmit);
      const lgoDir = app.config.logger.dir;
      const log = fs.readFileSync(path.join(lgoDir, 'common-error.log'), 'utf8');
      assert(/ENOENT: no such file or directory/.test(log));
      assert(
        /\[egg:background] task:mockError fail \([\d\.]+ms\)/.test(fs.readFileSync(path.join(lgoDir, 'egg-web.log'), 'utf8')),
      );
    });

    it('should always execute after setImmediate', async () => {
      const res = await app.httpRequest()
        .get('/sync')
        .expect(200);
      assert(Number(res.text) < 99);
      await app.backgroundTasksFinished();
    });
  });

  describe('ctx.runInBackground(scope) with single process mode', () => {
    // ctx.runInBackground with @eggjs/mock are override
    // single process mode will use the original ctx.runInBackground
    let app: MockApplication;
    before(async () => {
      app = await singleProcessApp('apps/ctx-background');
    });
    after(() => app.close());

    it('should run background task success', async () => {
      await app.httpRequest()
        .get('/')
        .expect(200)
        .expect('hello');
      await scheduler.wait(1200);
      const logDir = app.config.logger.dir!;
      const log = fs.readFileSync(path.join(logDir, 'ctx-background-web.log'), 'utf8');
      assert(/background run result file size: \d+/.test(log));
      assert(/background run anonymous result file size: \d+/.test(log));
      assert(
        /\[egg:background] task:saveUserInfo success \([\d\.]+ms\)/.test(fs.readFileSync(path.join(logDir, 'egg-web.log'), 'utf8')),
      );
      assert(
        /\[egg:background] task:.*?app[\/\\]controller[\/\\]home\.js:\d+:\d+ success \([\d\.]+ms\)/.test(fs.readFileSync(path.join(logDir, 'egg-web.log'), 'utf8')),
      );
    });

    it('should use custom task name first', async () => {
      await app.httpRequest()
        .get('/custom')
        .expect(200)
        .expect('hello');
      await scheduler.wait(1200);
      const logDir = app.config.logger.dir!;
      const log = fs.readFileSync(path.join(logDir, 'ctx-background-web.log'), 'utf8');
      assert(/background run result file size: \d+/.test(log));
      assert(
        /\[egg:background] task:customTaskName success \([\d\.]+ms\)/.test(fs.readFileSync(path.join(logDir, 'egg-web.log'), 'utf8')),
      );
    });

    it('should run background task error', async () => {
      mm.consoleLevel('NONE');

      let errorHadEmit = false;
      app.on('error', (err, ctx) => {
        assert(err.runInBackground);
        assert(/ENOENT: no such file or directory/.test(err.message));
        assert(ctx);
        errorHadEmit = true;
      });
      await app.httpRequest()
        .get('/error')
        .expect(200)
        .expect('hello error');
      await scheduler.wait(1200);
      assert(errorHadEmit);
      const logDir = app.config.logger.dir!;
      const log = fs.readFileSync(path.join(logDir, 'common-error.log'), 'utf8');
      assert(/ENOENT: no such file or directory/.test(log));
      assert(
        /\[egg:background] task:mockError fail \([\d\.]+ms\)/.test(fs.readFileSync(path.join(logDir, 'egg-web.log'), 'utf8')),
      );
    });
  });

  describe('tests on apps/demo', () => {
    before(() => {
      app = createApp('apps/demo');
      return app.ready();
    });
    after(() => app.close());

    describe('ctx.curl()', () => {
      it('should curl ok', async () => {
        const localServer = await startLocalServer();
        const context = app.mockContext();
        const res = await context.curl(`${localServer}/foo/bar`);
        assert(res.status === 200);
      });

      it('should curl as promise ok', () => {
        return startLocalServer()
          .then(localServer => app.mockContext().curl(`${localServer}/foo/bar`))
          .then(res => assert(res.status === 200));
      });
    });

    describe('ctx.httpclient', () => {
      it('should only one httpclient on one ctx', async () => {
        const ctx = app.mockContext();
        const httpclient = ctx.httpclient;
        assert(ctx.httpclient === httpclient);
        assert(typeof ctx.httpclient.request === 'function');
        assert(typeof ctx.httpclient.curl === 'function');
      });

      it('should httpclient alias to httpClient', async () => {
        const ctx = app.mockContext();
        assert.equal(ctx.httpclient, ctx.httpClient);
      });
    });

    describe('ctx.realStatus', () => {
      it('should get from status ok', () => {
        const context = app.mockContext();
        context.status = 200;
        assert(context.realStatus === 200);
      });

      it('should get from realStatus ok', () => {
        const context = app.mockContext();
        context.status = 302;
        context.realStatus = 500;
        assert(context.realStatus === 500);
      });
    });

    describe('ctx.state', () => {
      it('should delegate ctx.locals', () => {
        const context = app.mockContext() as any;
        context.locals = { a: 'a', b: 'b' };
        context.state = { a: 'aa', c: 'cc' };
        assert.deepEqual(context.state, { a: 'aa', b: 'b', c: 'cc' });
        assert(context.state === context.locals);
      });
    });

    describe('ctx.ip', () => {
      it('should get current request ip', () => {
        return app.httpRequest()
          .get('/ip')
          .expect(200)
          .expect({
            ip: '127.0.0.1',
          });
      });

      it('should set current request ip', () => {
        return app.httpRequest()
          .get('/ip?set_ip=10.2.2.2')
          .expect(200)
          .expect({
            ip: '10.2.2.2',
          });
      });
    });

    describe('get helper()', () => {
      it('should be the same helper instance', () => {
        const ctx = app.mockContext();
        const helper = ctx.helper;
        assert(ctx.helper === helper);
      });
    });

    describe('getLogger()', () => {
      it('should return null when logger name not exists', () => {
        const ctx = app.mockContext();
        assert(ctx.getLogger('not-exist-logger') === null);
      });

      it('should return same logger instance', () => {
        const ctx = app.mockContext();
        const logger = ctx.getLogger('coreLogger');
        assert(ctx.getLogger('coreLogger') === logger);
      });
    });

    describe('get router()', () => {
      it('should alias to app.router', () => {
        const ctx = app.mockContext();
        assert.equal(ctx.router, app.router);
      });

      it('should work with setter app.router', () => {
        const ctx = app.mockContext();
        (ctx as any).router = 'router';
        assert.equal(ctx.router, 'router');
      });
    });
  });
});
