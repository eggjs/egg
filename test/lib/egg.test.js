'use strict';

const mm = require('egg-mock');
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const request = require('supertest');
const sleep = require('mz-modules/sleep');
const spy = require('spy');
const Transport = require('egg-logger').Transport;
const utils = require('../utils');

describe('test/lib/egg.test.js', () => {
  afterEach(mm.restore);

  describe('dumpConfig()', () => {
    const baseDir = utils.getFilepath('apps/demo');
    let app;
    before(() => {
      app = utils.app('apps/demo');
      return app.ready();
    });
    after(() => app.close());

    it('should dump config and plugins', () => {
      let json = require(path.join(baseDir, 'run/agent_config.json'));
      assert(/\d+\.\d+\.\d+/.test(json.plugins.onerror.version));
      assert(json.config.name === 'demo');
      json = require(path.join(baseDir, 'run/application_config.json'));
      assert(/\d+\.\d+\.\d+/.test(json.plugins.onerror.version));
    });

    it('should ignore some type', () => {
      const json = require(path.join(baseDir, 'run/application_config.json'));
      assert(json.config.name === 'demo');
      assert(json.config.keys === '<String len: 3>');
      assert(json.config.buffer === '<Buffer len: 4>');
      assert(json.config.siteFile['/favicon.ico'] === '<Buffer len: 14191>');

      // don't change config
      assert(app.config.keys === 'foo');
    });

    it('should console.log call inspect()', () => {
      console.log(app);
    });

    it('should mock fs.writeFileSync error', done => {
      mm(fs, 'writeFileSync', () => {
        throw new Error('mock error');
      });
      mm(app.coreLogger, 'warn', msg => {
        assert(msg === 'dumpConfig error: mock error');
        done();
      });
      app.dumpConfig();
    });
  });

  describe('dumpConfig() dynamically', () => {
    let app;
    before(() => {
      app = utils.app('apps/dumpconfig');
    });
    after(() => app.close());

    it('should dump in config', function* () {
      const baseDir = utils.getFilepath('apps/dumpconfig');
      let json;

      yield sleep(100);
      json = readJson(path.join(baseDir, 'run/application_config.json'));
      assert(json.config.dynamic === 1);
      json = readJson(path.join(baseDir, 'run/agent_config.json'));
      assert(json.config.dynamic === 0);

      yield app.ready();

      yield sleep(100);
      json = readJson(path.join(baseDir, 'run/application_config.json'));
      assert(json.config.dynamic === 2);
      json = readJson(path.join(baseDir, 'run/agent_config.json'));
      assert(json.config.dynamic === 0);
    });
  });

  describe('dumpConfig() ignore error', () => {
    const baseDir = utils.getFilepath('apps/dump-ignore-error');
    let app;
    before(() => {
      app = utils.app('apps/dump-ignore-error');
      return app.ready();
    });
    after(() => app.close());

    it('should ignore config', () => {
      const json = require(path.join(baseDir, 'run/application_config.json'));
      assert(json.config.keys === 'test key');
    });
  });

  describe('close()', () => {
    let app;
    beforeEach(() => {
      app = utils.app('apps/demo');
      return app.ready();
    });

    it('should close all listeners', function* () {
      let index;
      index = process.listeners('unhandledRejection').indexOf(app._unhandledRejectionHandler);
      assert(index !== -1);
      index = process.listeners('unhandledRejection').indexOf(app.agent._unhandledRejectionHandler);
      assert(index !== -1);
      yield app.close();
      index = process.listeners('unhandledRejection').indexOf(app._unhandledRejectionHandler);
      assert(index === -1);
      index = process.listeners('unhandledRejection').indexOf(app.agent._unhandledRejectionHandler);
      assert(index === -1);
    });

    it('should emit close event before exit', function* () {
      let isAppClosed = false;
      let isAgentClosed = false;
      app.once('close', () => {
        isAppClosed = true;
      });
      app.agent.once('close', () => {
        isAgentClosed = true;
      });
      yield app.close();
      assert(isAppClosed === true);
      assert(isAgentClosed === true);
    });

    it('shoud close logger', function* () {
      const close = spy();
      class TestTransport extends Transport {
        close() {
          close();
        }
      }
      const transport = new TestTransport();
      for (const logger of app.loggers.values()) {
        logger.set('test', transport);
      }
      yield app.close();
      assert(close.called);
    });
  });

  describe('handle unhandledRejection', () => {
    let app;
    before(() => {
      app = utils.cluster('apps/app-throw');
      return app.ready();
    });
    after(() => app.close());

    it('should handle unhandledRejection and log it', function* () {
      yield request(app.callback())
        .get('/throw-unhandledRejection')
        .expect('foo')
        .expect(200);
      yield request(app.callback())
        .get('/throw-unhandledRejection-string')
        .expect('foo')
        .expect(200);
      yield request(app.callback())
        .get('/throw-unhandledRejection-obj')
        .expect('foo')
        .expect(200);

      yield sleep(1100);
      const logfile = path.join(utils.getFilepath('apps/app-throw'), 'logs/app-throw/common-error.log');
      const body = fs.readFileSync(logfile, 'utf8');
      assert(body.includes('nodejs.unhandledRejectionError: foo reject error'));
      assert(body.includes('nodejs.unhandledRejectionError: foo reject string error'));
      assert(body.includes('nodejs.TypeError: foo reject obj error'));
      // make sure stack exists and right
      assert(body.match(/at .+router.js:\d+:\d+\)/));
    });
  });

  describe('BaseContextClass', () => {
    let app;
    before(() => {
      app = utils.app('apps/base-context-class');
      return app.ready();
    });
    after(() => app.close());

    it('should access base context properties success', function* () {
      mm(app.config.logger, 'level', 'DEBUG');
      yield request(app.callback())
      .get('/')
      .expect('hello')
      .expect(200);

      const logPath = path.join(utils.getFilepath('apps/base-context-class'), 'logs/base-context-class/base-context-class-web.log');
      const log = fs.readFileSync(logPath, 'utf8');
      assert(log.match(/INFO .*? \[service\.home\] appname: base-context-class/));
      assert(log.match(/INFO .*? \[controller\.home\] appname: base-context-class/));
      assert(log.match(/WARN .*? \[service\.home\] warn/));
      assert(log.match(/WARN .*? \[controller\.home\] warn/));
      const errorPath = path.join(utils.getFilepath('apps/base-context-class'), 'logs/base-context-class/common-error.log');
      const error = fs.readFileSync(errorPath, 'utf8');
      assert(error.match(/nodejs.Error: some error/));
    });

    it('should get pathName success', function* () {
      yield request(app.callback())
      .get('/pathName')
      .expect('controller.home')
      .expect(200);
    });

    it('should get config success', function* () {
      yield request(app.callback())
      .get('/config')
      .expect('base-context-class')
      .expect(200);
    });
  });
});

function readJson(p) {
  return JSON.parse(fs.readFileSync(p));
}
