import { strict as assert } from 'node:assert';
import { mm } from '@eggjs/mock';
import fs from 'node:fs';
import path from 'node:path';
import { scheduler } from 'node:timers/promises';
import { pending } from 'pedding';
import { Application, CookieLimitExceedError } from '../src/index.js';
import { MockApplication, cluster, createApp, getFilepath, startLocalServer } from './utils.js';

describe('test/application.test.ts', () => {
  let app: MockApplication;

  afterEach(mm.restore);

  describe('create application', () => {
    it('should throw options.baseDir required', () => {
      assert.throws(() => {
        new Application({
          baseDir: 1,
        } as any);
      }, /options.baseDir required, and must be a string/);
    });

    it('should throw options.baseDir not exist', () => {
      assert.throws(() => {
        new Application({
          baseDir: 'not-exist',
        });
      }, /not-exist not exists/);
    });

    it('should throw options.baseDir is not a directory', () => {
      assert.throws(() => {
        new Application({
          baseDir: getFilepath('custom-egg/index.js'),
        });
      }, /not a directory|no such file or directory/);
    });
  });

  describe('app start timeout', function() {
    afterEach(() => app.close());
    it('should emit `startTimeout` event', function(done) {
      app = createApp('apps/app-start-timeout');
      app.once('startTimeout', done);
    });
  });

  describe('app.keys', () => {
    it('should throw when config.keys missing on non-local and non-unittest env', async () => {
      mm.env('test');
      app = createApp('apps/keys-missing');
      await app.ready();
      mm(app.config, 'keys', null);

      try {
        app.keys;
        throw new Error('should not run this');
      } catch (err: any) {
        assert(err.message === 'Please set config.keys first');
      }

      // make sure app close
      await app.close();
    });

    it('should throw when config.keys missing on unittest env', async () => {
      mm.env('unittest');
      app = createApp('apps/keys-missing');
      await app.ready();
      mm(app.config, 'keys', null);

      try {
        app.keys;
        throw new Error('should not run this');
      } catch (err: any) {
        assert(err.message === 'Please set config.keys first');
      }

      // make sure app closed
      await app.close();
    });

    it('should throw when config.keys missing on local env', async () => {
      mm.env('local');
      app = createApp('apps/keys-missing');
      await app.ready();
      mm(app.config, 'keys', null);

      try {
        app.keys;
        throw new Error('should not run this');
      } catch (err: any) {
        assert(err.message === 'Please set config.keys first');
      }

      // make sure app closed
      await app.close();
    });

    it('should use exists keys', async () => {
      mm.env('unittest');
      app = createApp('apps/keys-exists');
      await app.ready();

      assert(app.keys);
      assert(app.keys);
      assert(app.config.keys === 'my keys');

      await app.close();
    });
  });

  describe('handle uncaughtException', () => {
    let app: MockApplication;
    before(() => {
      app = cluster('apps/app-throw');
      return app.ready();
    });
    after(() => app.close());

    it('should handle uncaughtException and log it', async () => {
      await app.httpRequest()
        .get('/throw')
        .expect('foo')
        .expect(200);

      await scheduler.wait(1100);
      const logfile = path.join(getFilepath('apps/app-throw'), 'logs/app-throw/common-error.log');
      const body = fs.readFileSync(logfile, 'utf8');
      assert(body.includes('ReferenceError: a is not defined (uncaughtException throw'));
    });
  });

  describe('handle uncaughtException when error has only a getter', () => {
    let app: MockApplication;
    before(() => {
      app = cluster('apps/app-throw');
      return app.ready();
    });
    after(() => app.close());

    it('should handle uncaughtException and log it', async () => {
      await app.httpRequest()
        .get('/throw-error-setter')
        .expect('foo')
        .expect(200);

      await scheduler.wait(1100);
      const logfile = path.join(getFilepath('apps/app-throw'), 'logs/app-throw/common-error.log');
      const body = fs.readFileSync(logfile, 'utf8');
      assert(body.includes('abc (uncaughtException throw 1 times on pid'));
    });
  });

  describe('warn confused configurations', () => {
    it('should warn if confused configurations exist', async () => {
      const app = createApp('apps/confused-configuration');
      await app.ready();
      await scheduler.wait(1000);
      const logs = fs.readFileSync(getFilepath('apps/confused-configuration/logs/confused-configuration/confused-configuration-web.log'), 'utf8');
      assert.match(logs, /Unexpected config key `'bodyparser'` exists, Please use `'bodyParser'` instead\./);
      assert.match(logs, /Unexpected config key `'notFound'` exists, Please use `'notfound'` instead\./);
      assert.match(logs, /Unexpected config key `'sitefile'` exists, Please use `'siteFile'` instead\./);
      assert.match(logs, /Unexpected config key `'middlewares'` exists, Please use `'middleware'` instead\./);
      assert.match(logs, /Unexpected config key `'httpClient'` exists, Please use `'httpclient'` instead\./);
    });
  });

  describe('test on apps/demo', () => {
    let app: MockApplication;
    before(() => {
      app = createApp('apps/demo');
      return app.ready();
    });
    after(() => app.close());

    describe('application.deprecate', () => {
      it('should get deprecate with namespace egg', async () => {
        assert.equal(typeof app.deprecate, 'function');
      });
    });

    describe('curl()', () => {
      it('should curl success', async () => {
        const localServer = await startLocalServer();
        const res = await app.curl(`${localServer}/foo/app`);
        assert.equal(res.status, 200);
      });
    });

    describe('env', () => {
      it('should return app.config.env', () => {
        assert(app.env === app.config.env);
      });
    });

    describe('proxy', () => {
      it('should delegate app.config.proxy', () => {
        assert(app.proxy === app.config.proxy);
      });
    });

    describe('inspect && toJSON', () => {
      it('should override koa method', () => {
        const inspectResult = app.inspect();
        const jsonResult = app.toJSON();
        assert.deepEqual(inspectResult, jsonResult);
        assert.equal(inspectResult.env, app.config.env);
      });
    });

    describe('class style controller', () => {
      it('should work with class style controller', () => {
        return app.httpRequest()
          .get('/class-controller')
          .expect('this is bar!')
          .expect(200);
      });
    });

    describe('on cookieLimitExceed', () => {
      it('should log error', done => {
        const ctx = {
          coreLogger: {
            error(err: unknown) {
              assert(err instanceof CookieLimitExceedError);
              assert.equal(err.key, 'foo');
              assert.equal(err.cookie, 'value'.repeat(1000));
              assert.equal(err.name, 'CookieLimitExceedError');
              assert.equal(err.message, 'cookie foo\'s length(5000) exceed the limit(4093)');
              done();
            },
          },
        };
        app.emit('cookieLimitExceed', { name: 'foo', value: 'value'.repeat(1000), ctx });
      });
    });

    describe('request and response event', () => {
      it('should emit when request success', done => {
        done = pending(3, done);
        app.once('request', ctx => {
          assert(ctx.path === '/class-controller');
          done();
        });
        app.once('response', ctx => {
          assert(ctx.status === 200);
          done();
        });
        app.httpRequest()
          .get('/class-controller')
          .expect('this is bar!')
          .expect(200, done);
      });

      it('should emit when request error', done => {
        done = pending(3, done);
        app.once('request', ctx => {
          assert(ctx.path === '/obj-error');
          done();
        });
        app.once('response', ctx => {
          assert(ctx.status === 500);
          done();
        });
        app.httpRequest()
          .get('/obj-error')
          .expect(500, done);
      });
    });
  });
});
