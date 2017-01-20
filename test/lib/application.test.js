'use strict';

const Application = require('../../lib/application');
const utils = require('../utils');
const assert = require('assert');

describe('test/lib/application.test.js', () => {
  let app;

  describe('create application', () => {

    it('should throw options.baseDir required', () => {
      (function() {
        new Application({
          baseDir: 1,
        });
      }).should.throw('options.baseDir required, and must be a string');
    });

    it('should throw options.baseDir not exist', () => {
      (function() {
        new Application({
          baseDir: 'not-exist',
        });
      }).should.throw('Directory not-exist not exists');
    });

    it('should throw options.baseDir is not a directory', () => {
      (function() {
        new Application({
          baseDir: __filename,
        });
      }).should.throw(`Directory ${__filename} is not a directory`);
    });
  });

  describe('application.deprecate', () => {
    afterEach(() => app.close());

    it('should get deprecate with namespace egg', function* () {
      app = utils.app('apps/demo');
      yield app.ready();
      const deprecate = app.deprecate;
      deprecate._namespace.should.equal('egg');
      deprecate.should.equal(app.deprecate);
    });
  });

  describe('curl()', () => {
    afterEach(() => app.close());

    it('should curl success', function* () {
      app = utils.app('apps/demo');
      yield app.ready();
      const localServer = yield utils.startLocalServer();
      const res = yield app.curl(`${localServer}/foo/app`);
      res.status.should.equal(200);
    });
  });

  describe('env', () => {
    afterEach(() => app.close());

    it('should return app.config.env', function* () {
      app = utils.app('apps/demo');
      yield app.ready();
      assert(app.env === app.config.env);
    });
  });

  describe('proxy', () => {
    afterEach(() => app.close());

    it('should delegate app.config.proxy', function* () {
      app = utils.app('apps/demo');
      yield app.ready();
      assert(app.proxy === app.config.proxy);
    });
  });

  describe('app start timeout', function() {
    afterEach(() => app.close());
    it('should emit `startTimeout` event', function(done) {
      app = utils.app('apps/app-start-timeout');
      app.once('startTimeout', done);
    });
  });
});
