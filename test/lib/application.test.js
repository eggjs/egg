'use strict';

const assert = require('assert');
const mm = require('egg-mock');
const request = require('supertest');
const sleep = require('ko-sleep');
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

      try {
        app.keys;
        throw new Error('should not run this');
      } catch (err) {
        assert(err.message === 'Please set config.keys first');
      }

      // make sure app close
      yield app.close();
    });

    it('should auto set keys on unittest', function* () {
      mm.env('unittest');
      app = utils.app('apps/keys-missing');
      yield app.ready();

      assert(app.keys);
      assert(app.keys);
      assert(app.config.keys === 'foo, keys, you need to set your app keys');

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
      yield request(app.callback())
        .get('/throw')
        .expect('foo')
        .expect(200);

      yield sleep(1100);
      const logfile = path.join(utils.getFilepath('apps/app-throw'), 'logs/app-throw/common-error.log');
      const body = fs.readFileSync(logfile, 'utf8');
      assert(body.includes('ReferenceError: a is not defined (uncaughtException throw'));
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
        return request(app.callback())
          .get('/class-controller')
          .expect('this is bar!')
          .expect(200);
      });
    });
  });
});
