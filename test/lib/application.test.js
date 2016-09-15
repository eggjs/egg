'use strict';

const Application = require('../../lib/application');
const path = require('path');

describe('test/lib/application.test.js', () => {
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
    it('should get deprecate with namespace egg', () => {
      const app = createApplication();
      const deprecate = app.deprecate;
      deprecate._namespace.should.equal('egg');
      deprecate.should.equal(app.deprecate);
    });
  });

  describe('curl()', () => {
    it('should curl success', function* () {
      const app = createApplication();
      const res = yield app.curl('https://a.alipayobjects.com/aliBridge/1.0.0/aliBridge.min.js');
      res.status.should.equal(200);
    });
  });

  describe('dumpConfig()', () => {
    it('should dump config and plugins', () => {
      const baseDir = path.join(__dirname, '../fixtures/apps/demo');
      new Application({
        baseDir,
      });
      const json = require(path.join(baseDir, 'run/application_config.json'));
      json.plugins.onerror.version.should.match(/\d+\.\d+\.\d+/);
      json.config.name.should.equal('demo');
    });
  });

  describe('close()', () => {
    it('should close all listeners', () => {
      const baseDir = path.join(__dirname, '../fixtures/apps/demo');
      const application = new Application({
        baseDir,
      });
      process.listeners('unhandledRejection')
        .indexOf(application._unhandledRejectionHandler).should.not.equal(-1);
      application.close();
      process.listeners('unhandledRejection')
        .indexOf(application._unhandledRejectionHandler).should.equal(-1);
    });
    it('should emit close event before exit', () => {
      const baseDir = path.join(__dirname, '../fixtures/apps/demo');
      const application = new Application({
        baseDir,
      });
      let called = false;
      application.on('close', () => {
        called = true;
      });
      application.close();
      called.should.equal(true);
    });
  });

  describe('app start timeout', function() {
    it('should emit `startTimeout` event', function(done) {
      const baseDir = path.join(__dirname, '../fixtures/apps/app-start-timeout');
      const application = new Application({
        baseDir,
      });
      application.once('startTimeout', done);
    });
  });
});

function createApplication(options) {
  options = options || {};
  options.baseDir = options.baseDir || path.join(__dirname, '../fixtures/apps/demo');
  return new Application(options);
}
