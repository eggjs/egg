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
      let json = require(path.join(baseDir, 'run/agent_config.json'));
      assert(/\d+\.\d+\.\d+/.test(json.plugins.onerror.version));
      assert(json.config.name === 'demo');
      assert(json.config.tips === 'hello egg');
      json = require(path.join(baseDir, 'run/application_config.json'));
      checkApp(json);

      const dumpped = app.dumpConfigToObject();
      checkApp(dumpped.config);

      function checkApp(json) {
        assert(/\d+\.\d+\.\d+/.test(json.plugins.onerror.version));
        assert(json.config.name === 'demo');
        // should dump dynamic config
        assert(json.config.tips === 'hello egg started');
      }
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
      checkApp(json);

      const dumpped = app.dumpConfigToObject();
      checkApp(dumpped.meta);

      function checkApp(json) {
        assert(json.name === path.join(__dirname, '../../config/config.default.js'));
        assert(json.buffer === path.join(baseDir, 'config/config.default.js'));
      }
    });

    it('should ignore some type', () => {
      const json = require(path.join(baseDir, 'run/application_config.json'));
      checkApp(json);

      const dumpped = app.dumpConfigToObject();
      checkApp(dumpped.config);

      function checkApp(json) {
        assert(json.config.mysql.accessId === 'this is accessId');

        assert(json.config.name === 'demo');
        assert(json.config.keys === '<String len: 3>');
        assert(json.config.buffer === '<Buffer len: 4>');
        assert(json.config.siteFile['/favicon.ico'].startsWith('<Buffer len:'));

        assert(json.config.pass === '<String len: 12>');
        assert(json.config.pwd === '<String len: 11>');
        assert(json.config.password === '<String len: 16>');
        assert(json.config.passwordNew === 'this is passwordNew');
        assert(json.config.mysql.passd === '<String len: 13>');
        assert(json.config.mysql.passwd === '<String len: 14>');
        assert(json.config.mysql.secret === '<String len: 10>');
        assert(json.config.mysql.secretNumber === '<Number>');
        assert(json.config.mysql.masterKey === '<String len: 17>');
        assert(json.config.mysql.accessKey === '<String len: 17>');
        assert(json.config.mysql.consumerSecret === '<String len: 22>');
        assert(json.config.mysql.someSecret === null);

        // don't change config
        assert(app.config.keys === 'foo');
      }
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

    it('should has log', () => {
      const eggLogPath = utils.getFilepath('apps/demo/logs/demo/egg-web.log');
      let content = fs.readFileSync(eggLogPath, 'utf8');
      assert(/\[egg:core] dump config after load, \d+ms/.test(content));
      assert(/\[egg:core] dump config after ready, \d+ms/.test(content));

      const agentLogPath = utils.getFilepath('apps/demo/logs/demo/egg-agent.log');
      content = fs.readFileSync(agentLogPath, 'utf8');
      assert(/\[egg:core] dump config after load, \d+ms/.test(content));
      assert(/\[egg:core] dump config after ready, \d+ms/.test(content));
    });

    it('should read timing data', function* () {
      let json = readJson(path.join(baseDir, `run/agent_timing_${process.pid}.json`));
      assert(json.length === 40);
      assert(json[0].name === 'Application Start');
      assert(json[0].pid === process.pid);

      json = readJson(path.join(baseDir, `run/application_timing_${process.pid}.json`));
      assert(json.length === 62);
      assert(json[0].name === 'Application Start');
      assert(json[0].pid === process.pid);
    });

    it('should ignore error when dumpTiming', done => {
      mm(fs, 'writeFileSync', () => {
        throw new Error('mock error');
      });
      mm(app.coreLogger, 'warn', msg => {
        assert(msg === 'dumpTiming error: mock error');
        done();
      });
      app.dumpTiming();
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
      let json;

      await sleep(100);
      json = readJson(path.join(baseDir, 'run/application_config.json'));
      assert(json.config.dynamic === 1);
      json = readJson(path.join(baseDir, 'run/agent_config.json'));
      assert(json.config.dynamic === 0);

      await app.ready();

      await sleep(100);
      json = readJson(path.join(baseDir, 'run/application_config.json'));
      assert(json.config.dynamic === 2);
      json = readJson(path.join(baseDir, 'run/agent_config.json'));
      assert(json.config.dynamic === 0);
    });
  });

  describe('dumpConfig() with circular', () => {
    let app;
    before(() => {
      app = utils.app('apps/dumpconfig-circular');
    });
    after(() => app.close());

    it('should dump in config', async () => {
      const baseDir = utils.getFilepath('apps/dumpconfig-circular');
      await sleep(100);
      await app.ready();

      await sleep(100);
      const json = readJson(path.join(baseDir, 'run/application_config.json'));
      assert.deepEqual(json.config.foo, [ '~config~foo' ]);
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
    before('before: should cluster app ready', () => {
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

  describe.skip('egg-ready', () => {
    let app;
    before(() => {
      app = utils.app('apps/demo');
    });
    after(() => app.close());

    it('should only trigger once', async () => {
      let triggerCount = 0;
      mm(app.lifecycle, 'triggerServerDidReady', () => {
        triggerCount++;
      });
      await app.ready();
      app.messenger.emit('egg-ready');
      app.messenger.emit('egg-ready');
      app.messenger.emit('egg-ready');
      assert(triggerCount === 1);
    });
  });

  describe('createAnonymousContext()', () => {
    let app;
    before(() => {
      app = utils.app('apps/demo');
      return app.ready();
    });
    after(() => app.close());

    it('should create anonymous context', async () => {
      let ctx = app.createAnonymousContext();
      assert(ctx);
      assert(ctx.host === '127.0.0.1');
      ctx = app.agent.createAnonymousContext();
      assert(ctx);
    });
  });
});

function readJson(p) {
  return JSON.parse(fs.readFileSync(p));
}
