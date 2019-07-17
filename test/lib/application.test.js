'use strict';

const assert = require('assert');
const mm = require('egg-mock');
const sleep = require('mz-modules/sleep');
const fs = require('fs');
const path = require('path');
const pedding = require('pedding');
const Application = require('../../lib/application');
const utils = require('../utils');

describe('test/lib/application.test.js', () => {
  let app;

  afterEach(mm.restore);

  describe('create application', () => {
    it('should throw options.baseDir required', () => {
      assert.throws(() => {
        new Application({
          baseDir: 1,
        });
      }, /options.baseDir required, and must be a string/);
    });

    it('should throw options.baseDir not exist', () => {
      assert.throws(() => {
        new Application({
          baseDir: 'not-exist',
        });
      }, /Directory not-exist not exists/);
    });

    it('should throw options.baseDir is not a directory', () => {
      assert.throws(() => {
        new Application({
          baseDir: __filename,
        });
      }, /is not a directory/);
    });
  });

  describe('app start timeout', function() {
    afterEach(() => app.close());
    it('should emit `startTimeout` event', function(done) {
      app = utils.app('apps/app-start-timeout');
      app.once('startTimeout', done);
    });
  });

  describe('app.keys', () => {
    it('should throw when config.keys missing on non-local and non-unittest env', async () => {
      mm.env('test');
      app = utils.app('apps/keys-missing');
      await app.ready();
      mm(app.config, 'keys', null);

      try {
        app.keys;
        throw new Error('should not run this');
      } catch (err) {
        assert(err.message === 'Please set config.keys first');
      }

      // make sure app close
      await app.close();
    });

    it('should throw when config.keys missing on unittest env', async () => {
      mm.env('unittest');
      app = utils.app('apps/keys-missing');
      await app.ready();
      mm(app.config, 'keys', null);

      try {
        app.keys;
        throw new Error('should not run this');
      } catch (err) {
        assert(err.message === 'Please set config.keys first');
      }

      // make sure app close
      await app.close();
    });

    it('should throw when config.keys missing on local env', async () => {
      mm.env('local');
      app = utils.app('apps/keys-missing');
      await app.ready();
      mm(app.config, 'keys', null);

      try {
        app.keys;
        throw new Error('should not run this');
      } catch (err) {
        assert(err.message === 'Please set config.keys first');
      }

      // make sure app close
      await app.close();
    });

    it('should use exists keys', async () => {
      mm.env('unittest');
      app = utils.app('apps/keys-exists');
      await app.ready();

      assert(app.keys);
      assert(app.keys);
      assert(app.config.keys === 'my keys');

      await app.close();
    });
  });

  describe('handle uncaughtException', () => {
    let app;
    before(() => {
      app = utils.cluster('apps/app-throw');
      return app.ready();
    });
    after(() => app.close());

    it('should handle uncaughtException and log it', async () => {
      await app.httpRequest()
        .get('/throw')
        .expect('foo')
        .expect(200);

      await sleep(1100);
      const logfile = path.join(utils.getFilepath('apps/app-throw'), 'logs/app-throw/common-error.log');
      const body = fs.readFileSync(logfile, 'utf8');
      assert(body.includes('ReferenceError: a is not defined (uncaughtException throw'));
    });
  });

  describe('handle uncaughtException when error has only a getter', () => {
    let app;
    before(() => {
      app = utils.cluster('apps/app-throw');
      return app.ready();
    });
    after(() => app.close());

    it('should handle uncaughtException and log it', async () => {
      await app.httpRequest()
        .get('/throw-error-setter')
        .expect('foo')
        .expect(200);

      await sleep(1100);
      const logfile = path.join(utils.getFilepath('apps/app-throw'), 'logs/app-throw/common-error.log');
      const body = fs.readFileSync(logfile, 'utf8');
      assert(body.includes('abc (uncaughtException throw 1 times on pid'));
    });
  });

  describe('warn confused configurations', () => {
    it('should warn if confused configurations exist', async () => {
      const app = utils.app('apps/confused-configuration');
      await app.ready();
      await sleep(1000);
      const logs = fs.readFileSync(utils.getFilepath('apps/confused-configuration/logs/confused-configuration/confused-configuration-web.log'), 'utf8');
      assert(logs.match(/Unexpected config key `bodyparser` exists, Please use `bodyParser` instead\./));
      assert(logs.match(/Unexpected config key `notFound` exists, Please use `notfound` instead\./));
      assert(logs.match(/Unexpected config key `sitefile` exists, Please use `siteFile` instead\./));
      assert(logs.match(/Unexpected config key `middlewares` exists, Please use `middleware` instead\./));
      assert(logs.match(/Unexpected config key `httpClient` exists, Please use `httpclient` instead\./));
    });
  });

  describe('test on apps/demo', () => {
    let app;
    before(() => {
      app = utils.app('apps/demo');
      return app.ready();
    });
    after(() => app.close());

    describe('application.deprecate', () => {
      it('should get deprecate with namespace egg', async () => {
        const deprecate = app.deprecate;
        assert(deprecate._namespace === 'egg');
        assert(deprecate === app.deprecate);
      });
    });

    describe('curl()', () => {
      it('should curl success', async () => {
        const localServer = await utils.startLocalServer();
        const res = await app.curl(`${localServer}/foo/app`);
        assert(res.status === 200);
      });
    });

    describe('env', () => {
      it('should return app.config.env', async () => {
        assert(app.env === app.config.env);
      });
    });

    describe('proxy', () => {
      it('should delegate app.config.proxy', async () => {
        assert(app.proxy === app.config.proxy);
      });
    });

    describe('inspect && toJSON', () => {
      it('should override koa method', function() {
        const inspectResult = app.inspect();
        const jsonResult = app.toJSON();
        assert.deepEqual(inspectResult, jsonResult);
        assert(inspectResult.env === app.config.env);
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
            error(err) {
              assert(err.key === 'name');
              assert(err.cookie === 'value');
              assert(err.name === 'CookieLimitExceedError');
              done();
            },
          },
        };
        app.emit('cookieLimitExceed', { name: 'name', value: 'value', ctx });
      });
    });

    describe('request and response event', () => {
      it('should emit when request success', done => {
        done = pedding(done, 3);
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
        done = pedding(done, 3);
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
