'use strict';

const Application = require('../../lib/application');
const path = require('path');

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

    it('should get deprecate with namespace egg', () => {
      app = createApplication();
      const deprecate = app.deprecate;
      deprecate._namespace.should.equal('egg');
      deprecate.should.equal(app.deprecate);
      return app.ready();
    });
  });

  describe('curl()', () => {
    afterEach(() => app.close());
    it('should curl success', function* () {
      this.timeout(10000);
      app = createApplication();
      yield app.ready();
      const res = yield app.curl('https://a.alipayobjects.com/aliBridge/1.0.0/aliBridge.min.js');
      res.status.should.equal(200);
    });
  });

  describe('dumpConfig()', () => {
    afterEach(() => app.close());
    it('should dump config and plugins', () => {
      const baseDir = path.join(__dirname, '../fixtures/apps/demo');
      app = new Application({
        baseDir,
      });
      const json = require(path.join(baseDir, 'run/application_config.json'));
      json.plugins.onerror.version.should.match(/\d+\.\d+\.\d+/);
      json.config.name.should.equal('demo');
      return app.ready();
    });
  });

  describe('close()', () => {
    afterEach(() => app.close());
    it('should close all listeners', function* () {
      const baseDir = path.join(__dirname, '../fixtures/apps/demo');
      app = new Application({
        baseDir,
      });
      yield app.ready();
      process.listeners('unhandledRejection')
        .indexOf(app._unhandledRejectionHandler).should.not.equal(-1);
      yield app.close();
      process.listeners('unhandledRejection')
        .indexOf(app._unhandledRejectionHandler).should.equal(-1);
    });
    it('should emit close event before exit', function* () {
      const baseDir = path.join(__dirname, '../fixtures/apps/demo');
      app = new Application({
        baseDir,
      });
      yield app.ready();
      let called = false;
      app.on('close', () => {
        called = true;
      });
      yield app.close();
      called.should.equal(true);
    });
  });

  describe('app start timeout', function() {
    afterEach(() => app.close());
    it('should emit `startTimeout` event', function(done) {
      const baseDir = path.join(__dirname, '../fixtures/apps/app-start-timeout');
      app = new Application({
        baseDir,
      });
      app.once('startTimeout', done);
    });
  });
});

function createApplication(options) {
  options = options || {};
  options.baseDir = options.baseDir || path.join(__dirname, '../fixtures/apps/demo');
  return new Application(options);
}
