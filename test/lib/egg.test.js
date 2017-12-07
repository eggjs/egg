'use strict';

const mm = require('egg-mock');
const assert = require('assert');
const path = require('path');
const fs = require('fs');
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
      let config = require(path.join(baseDir, 'run/agent_config.json'));
      assert(config.name === 'demo');
      assert(config.tips === 'hello egg');
      config = require(path.join(baseDir, 'run/application_config.json'));
      // should dump dynamic config
      assert(config.tips === 'hello egg started');
    });

    it('should dump plugins', () => {
      const json = require(path.join(baseDir, 'run/plugin.json'));
      assert(/\d+\.\d+\.\d+/.test(json.onerror.version));
    });

    it('should dump router json', () => {
      const routers = require(path.join(baseDir, 'run/router.json'));
      // 13 static routers on app/router.js and 1 dynamic router on app.js
      assert(routers.length === 14);
      for (const router of routers) {
        assert.deepEqual(Object.keys(router), [
          'name',
          'methods',
          'paramNames',
          'path',
          'regexp',
          'stack',
        ]);
      }
    });

    it('should dump config meta', () => {
      let json = require(path.join(baseDir, 'run/agent_config_meta.json'));
      assert(json.name === path.join(__dirname, '../../config/config.default.js'));
      assert(json.buffer === path.join(baseDir, 'config/config.default.js'));
      json = require(path.join(baseDir, 'run/application_config_meta.json'));
      assert(json.name === path.join(__dirname, '../../config/config.default.js'));
      assert(json.buffer === path.join(baseDir, 'config/config.default.js'));
    });

    it('should ignore some type', () => {
      const config = require(path.join(baseDir, 'run/application_config.json'));
      assert(config.mysql.accessId === 'this is accessId');

      assert(config.name === 'demo');
      assert(config.keys === '<String len: 3>');
      assert(config.buffer === '<Buffer len: 4>');
      assert(config.siteFile['/favicon.ico'] === '<Buffer len: 14191>');

      assert(config.pass === '<String len: 12>');
      assert(config.pwd === '<String len: 11>');
      assert(config.password === '<String len: 16>');
      assert(config.passwordNew === 'this is passwordNew');
      assert(config.mysql.passd === '<String len: 13>');
      assert(config.mysql.passwd === '<String len: 14>');
      assert(config.mysql.secret === '<String len: 10>');
      assert(config.mysql.secretNumber === '<Number>');
      assert(config.mysql.masterKey === '<String len: 17>');
      assert(config.mysql.accessKey === '<String len: 17>');
      assert(config.mysql.consumerSecret === '<String len: 22>');
      assert(config.mysql.someSecret === null);

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

    it('should dump in config', async () => {
      const baseDir = utils.getFilepath('apps/dumpconfig');
      let config;

      await sleep(100);
      config = readJson(path.join(baseDir, 'run/application_config.json'));
      assert(config.dynamic === 1);
      config = readJson(path.join(baseDir, 'run/agent_config.json'));
      assert(config.dynamic === 0);

      await app.ready();

      await sleep(100);
      config = readJson(path.join(baseDir, 'run/application_config.json'));
      assert(config.dynamic === 2);
      config = readJson(path.join(baseDir, 'run/agent_config.json'));
      assert(config.dynamic === 0);
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
      const config = require(path.join(baseDir, 'run/application_config.json'));
      assert(config.keys === 'test key');
    });
  });

  describe('close()', () => {
    let app;
    beforeEach(() => {
      app = utils.app('apps/demo');
      return app.ready();
    });

    it('should close all listeners', async () => {
      let index;
      index = process.listeners('unhandledRejection').indexOf(app._unhandledRejectionHandler);
      assert(index !== -1);
      index = process.listeners('unhandledRejection').indexOf(app.agent._unhandledRejectionHandler);
      assert(index !== -1);
      await app.close();
      index = process.listeners('unhandledRejection').indexOf(app._unhandledRejectionHandler);
      assert(index === -1);
      index = process.listeners('unhandledRejection').indexOf(app.agent._unhandledRejectionHandler);
      assert(index === -1);
    });

    it('should emit close event before exit', async () => {
      let isAppClosed = false;
      let isAgentClosed = false;
      app.once('close', () => {
        isAppClosed = true;
      });
      app.agent.once('close', () => {
        isAgentClosed = true;
      });
      await app.close();
      assert(isAppClosed === true);
      assert(isAgentClosed === true);
    });

    it('shoud close logger', async () => {
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
      await app.close();
      assert(close.called);
    });
  });

  describe('handle unhandledRejection', () => {
    let app;
    after(() => app.close());

    // use it to record create coverage codes time
    it('before: should cluster app ready', () => {
      app = utils.cluster('apps/app-throw');
      app.coverage(true);
      return app.ready();
    });

    it('should handle unhandledRejection and log it', async () => {
      await app.httpRequest()
        .get('/throw-unhandledRejection')
        .expect('foo')
        .expect(200);
      await app.httpRequest()
        .get('/throw-unhandledRejection-string')
        .expect('foo')
        .expect(200);
      await app.httpRequest()
        .get('/throw-unhandledRejection-obj')
        .expect('foo')
        .expect(200);

      await sleep(1100);
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

    it('should access base context properties success', async () => {
      mm(app.config.logger, 'level', 'DEBUG');
      await app.httpRequest()
        .get('/')
        .expect('hello')
        .expect(200);

      await sleep(1000);

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

    it('should get pathName success', async () => {
      await app.httpRequest()
        .get('/pathName')
        .expect('controller.home')
        .expect(200);
    });

    it('should get config success', async () => {
      await app.httpRequest()
        .get('/config')
        .expect('base-context-class')
        .expect(200);
    });
  });
});

function readJson(p) {
  return JSON.parse(fs.readFileSync(p));
}
