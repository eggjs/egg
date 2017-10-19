'use strict';

const assert = require('assert');
const mm = require('egg-mock');
const sleep = require('mz-modules/sleep');
const fs = require('fs');
const path = require('path');
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
    it('should throw when config.keys missing on non-local and non-unittest env', function* () {
      mm.env('test');
      app = utils.app('apps/keys-missing');
      yield app.ready();
      mm(app.config, 'keys', null);

      try {
        app.keys;
        throw new Error('should not run this');
      } catch (err) {
        assert(err.message === 'Please set config.keys first');
      }

      // make sure app close
      yield app.close();
    });

    it('should throw when config.keys missing on unittest env', function* () {
      mm.env('unittest');
      app = utils.app('apps/keys-missing');
      yield app.ready();
      mm(app.config, 'keys', null);

      try {
        app.keys;
        throw new Error('should not run this');
      } catch (err) {
        assert(err.message === 'Please set config.keys first');
      }

      // make sure app close
      yield app.close();
    });

    it('should throw when config.keys missing on local env', function* () {
      mm.env('local');
      app = utils.app('apps/keys-missing');
      yield app.ready();
      mm(app.config, 'keys', null);

      try {
        app.keys;
        throw new Error('should not run this');
      } catch (err) {
        assert(err.message === 'Please set config.keys first');
      }

      // make sure app close
      yield app.close();
    });

    it('should use exists keys', function* () {
      mm.env('unittest');
      app = utils.app('apps/keys-exists');
      yield app.ready();

      assert(app.keys);
      assert(app.keys);
      assert(app.config.keys === 'my keys');

      yield app.close();
    });
  });

  describe('handle uncaughtException', () => {
    let app;
    before(() => {
      app = utils.cluster('apps/app-throw');
      return app.ready();
    });
    after(() => app.close());

    it('should handle uncaughtException and log it', function* () {
      yield app.httpRequest()
        .get('/throw')
        .expect('foo')
        .expect(200);

      yield sleep(1100);
      const logfile = path.join(utils.getFilepath('apps/app-throw'), 'logs/app-throw/common-error.log');
      const body = fs.readFileSync(logfile, 'utf8');
      assert(body.includes('ReferenceError: a is not defined (uncaughtException throw'));
    });
  });

  describe('warn confused configurations', () => {
    it('should warn if confused configurations exist', function* () {
      const app = utils.app('apps/confused-configuration');
      yield app.ready();
      yield sleep(1000);
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
      it('should get deprecate with namespace egg', function* () {
        const deprecate = app.deprecate;
        assert(deprecate._namespace === 'egg');
        assert(deprecate === app.deprecate);
      });
    });

    describe('curl()', () => {
      it('should curl success', function* () {
        const localServer = yield utils.startLocalServer();
        const res = yield app.curl(`${localServer}/foo/app`);
        assert(res.status === 200);
      });
    });

    describe('env', () => {
      it('should return app.config.env', function* () {
        assert(app.env === app.config.env);
      });
    });

    describe('proxy', () => {
      it('should delegate app.config.proxy', function* () {
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
  });
});
