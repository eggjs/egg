import { strict as assert } from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import { scheduler } from 'node:timers/promises';
import { mm } from '@eggjs/mock';
import { Transport } from 'egg-logger';
import { createApp, cluster, getFilepath, MockApplication } from '../utils.js';
import assertFile from 'assert-file';
import { readJSONSync } from 'utility';

describe('test/lib/egg.test.ts', () => {
  afterEach(mm.restore);

  describe('dumpConfig()', () => {
    const baseDir = getFilepath('apps/demo');
    let app: MockApplication;
    before(async () => {
      app = createApp('apps/demo');
      await app.ready();
      // CI 环境 Windows 写入磁盘需要时间
      await scheduler.wait(1100);
    });
    after(() => app.close());

    it('should dump config, plugins, appInfo', () => {
      let json = readJSONSync(path.join(baseDir, 'run/agent_config.json'));
      assert(/\d+\.\d+\.\d+/.test(json.plugins.onerror.version));
      assert(json.config.name === 'demo');
      assert(json.config.tips === 'hello egg');
      assert(json.appInfo.name === 'demo');
      json = readJSONSync(path.join(baseDir, 'run/application_config.json'));
      checkApp(json);

      const dumpped = app.dumpConfigToObject();
      checkApp(dumpped.config);

      function checkApp(json: any) {
        assert(/\d+\.\d+\.\d+/.test(json.plugins.onerror.version));
        assert(json.config.name === 'demo');
        // should dump dynamic config
        assert(json.config.tips === 'hello egg started');

        assert(json.appInfo);
      }
    });

    it('should dump router json', () => {
      const routers = readJSONSync(path.join(baseDir, 'run/router.json'));
      // 13 static routers on app/router.js and 1 dynamic router on app.js
      assert(routers.length === 14);
      for (const router of routers) {
        if ('name' in router) {
          assert.deepEqual(Object.keys(router), [
            'name',
            'methods',
            'paramNames',
            'path',
            'regexp',
            'stack',
          ]);
        } else {
          assert.deepEqual(Object.keys(router), [
            'methods',
            'paramNames',
            'path',
            'regexp',
            'stack',
          ]);
        }
      }
    });

    it('should dump config meta', () => {
      let json = readJSONSync(path.join(baseDir, 'run/agent_config_meta.json'));
      // assert(json.name === path.join(__dirname, '../../config/config.default.js'));
      assert(json.buffer === path.join(baseDir, 'config/config.default.js'));

      json = readJSONSync(path.join(baseDir, 'run/application_config_meta.json'));
      checkApp(json);

      const dump = app.dumpConfigToObject();
      checkApp(dump.meta);

      function checkApp(json: any) {
        // assert(json.name === path.join(__dirname, '../../config/config.default.js'));
        assert(json.buffer === path.join(baseDir, 'config/config.default.js'));
      }
    });

    it('should ignore some type', () => {
      const json = readJSONSync(path.join(baseDir, 'run/application_config.json'));
      checkApp(json);

      const dump = app.dumpConfigToObject();
      checkApp(dump.config);

      function checkApp(json: any) {
        assert.equal(json.config.mysql.accessId, 'this is accessId');

        assert.equal(json.config.name, 'demo');
        assert.equal(json.config.keys, '<String len: 3>');
        assert.equal(json.config.buffer, '<Buffer len: 4>');
        assert.match(json.config.siteFile['/favicon.ico'], /^file:/);

        assert.equal(json.config.pass, '<String len: 12>');
        assert.equal(json.config.pwd, '<String len: 11>');
        assert.equal(json.config.password, '<String len: 16>');
        assert.equal(json.config.passwordNew, 'this is passwordNew');
        assert.equal(json.config.mysql.passd, '<String len: 13>');
        assert.equal(json.config.mysql.passwd, '<String len: 14>');
        assert.equal(json.config.mysql.secret, '<String len: 10>');
        assert.equal(json.config.mysql.secretNumber, '<Number>');
        assert.equal(json.config.mysql.masterKey, '<String len: 17>');
        assert.equal(json.config.mysql.accessKey, '<String len: 17>');
        assert.equal(json.config.mysql.consumerSecret, '<String len: 22>');
        assert.equal(json.config.mysql.someSecret, null);

        // don't change config
        assert.equal(app.config.keys, 'foo');
      }
    });

    // it('should console.log call inspect()', () => {
    //   console.log(app);
    // });

    it('should mock fs.writeFileSync error', done => {
      mm(fs, 'writeFileSync', () => {
        throw new Error('mock error');
      });
      mm(app.coreLogger, 'warn', (msg: any) => {
        assert.equal(msg, '[egg] dumpConfig error: mock error');
        done();
      });
      app.dumpConfig();
    });

    it.skip('should has log', () => {
      const eggLogPath = getFilepath('apps/demo/logs/demo/egg-web.log');
      let content = fs.readFileSync(eggLogPath, 'utf8');
      assert.match(content, /\[egg] dump config after load, \d+ms/);
      assert.match(content, /\[egg] dump config after ready, \d+ms/);

      const agentLogPath = getFilepath('apps/demo/logs/demo/egg-agent.log');
      content = fs.readFileSync(agentLogPath, 'utf8');
      assert.match(content, /\[egg] dump config after load, \d+ms/);
      assert.match(content, /\[egg] dump config after ready, \d+ms/);
    });

    it('should read timing data', () => {
      let json = readJSONSync(path.join(baseDir, `run/agent_timing_${process.pid}.json`));
      // assert.equal(json.length, 43);
      assert.equal(json[1].name, 'agent Start');
      assert.equal(json[0].pid, process.pid);

      json = readJSONSync(path.join(baseDir, `run/application_timing_${process.pid}.json`));
      // assert(json.length === 64);
      assert.equal(json[1].name, 'application Start');
      assert.equal(json[0].pid, process.pid);
    });

    it('should disable timing after ready', () => {
      const json = app.timing.toJSON();
      const last = json[json.length - 1];
      app.timing.start('a');
      app.timing.end('a');
      const json2 = app.timing.toJSON();
      assert.equal(json2[json.length - 1].name, last.name);
    });

    it('should ignore error when dumpTiming', done => {
      mm(fs, 'writeFileSync', () => {
        throw new Error('mock error');
      });
      mm(app.coreLogger, 'warn', (msg: any) => {
        assert.equal(msg, '[egg] dumpTiming error: mock error');
        done();
      });
      app.dumpTiming();
    });

    it('should dumpTiming when timeout', async () => {
      if (process.platform === 'win32') return;
      const baseDir = getFilepath('apps/dumptiming-timeout');
      fs.rmSync(path.join(baseDir, 'run'), { recursive: true, force: true });
      fs.rmSync(path.join(baseDir, 'logs'), { recursive: true, force: true });
      const app = createApp(baseDir);
      await app.ready();
      await scheduler.wait(100);
      assertFile(path.join(baseDir, `run/application_timing_${process.pid}.json`));
      assertFile(path.join(baseDir, 'logs/dumptiming-timeout/common-error.log'),
        /unfinished timing item: {"name":"Did Load in app.js:didLoad"/);
      await app.close();
    });

    it('should dump slow-boot-action warnning log', async () => {
      if (process.platform === 'win32') return;
      const baseDir = getFilepath('apps/dumptiming-slowBootActionMinDuration');
      fs.rmSync(path.join(baseDir, 'run'), { recursive: true, force: true });
      fs.rmSync(path.join(baseDir, 'logs'), { recursive: true, force: true });
      const app = createApp(baseDir);
      await app.ready();
      await scheduler.wait(100);
      assertFile(path.join(baseDir, 'logs/dumptiming-slowBootActionMinDuration/egg-web.log'),
        /\[slow-boot-action] #\d+ \d+ms, name: Did Load in app\.js:didLoad/);
      await app.close();
    });
  });

  describe('dump disabled plugin', () => {
    let app: MockApplication;
    before(async () => {
      app = createApp('apps/dumpconfig');
      await app.ready();
    });
    after(() => app.close());

    it('should works', async () => {
      const baseDir = getFilepath('apps/dumpconfig');
      const json = readJSONSync(path.join(baseDir, 'run/application_config.json'));
      assert(!json.plugins.static.enable);
    });
  });

  describe('dumpConfig() dynamically', () => {
    let app: MockApplication;
    before(() => {
      app = createApp('apps/dumpconfig');
    });
    after(() => app.close());

    it('should dump in config', async () => {
      const baseDir = getFilepath('apps/dumpconfig');
      let json;

      await app.ready();

      json = readJSONSync(path.join(baseDir, 'run/application_config.json'));
      assert(json.config.dynamic === 2);
      json = readJSONSync(path.join(baseDir, 'run/agent_config.json'));
      assert(json.config.dynamic === 0);
    });
  });

  describe('dumpConfig() with circular', () => {
    let app: MockApplication;
    before(() => {
      app = createApp('apps/dumpconfig-circular');
    });
    after(() => app.close());

    it('should dump in config', async () => {
      const baseDir = getFilepath('apps/dumpconfig-circular');
      await app.ready();
      await scheduler.wait(100);
      const json = readJSONSync(path.join(baseDir, 'run/application_config.json'));
      assert.deepEqual(json.config.foo, [ '~config~foo' ]);
    });
  });

  describe('dumpConfig() ignore error', () => {
    const baseDir = getFilepath('apps/dump-ignore-error');
    let app: MockApplication;
    before(() => {
      app = createApp('apps/dump-ignore-error');
      return app.ready();
    });
    after(() => app.close());

    it('should ignore config', () => {
      const json = readJSONSync(path.join(baseDir, 'run/application_config.json'));
      assert(json.config.keys === 'test key');
    });
  });

  describe('custom config from env', () => {
    let app: MockApplication;
    let baseDir: string;
    let runDir: string;
    let logDir: string;
    before(async () => {
      baseDir = getFilepath('apps/config-env');
      runDir = path.join(baseDir, 'custom_rundir');
      logDir = path.join(baseDir, 'custom_logdir');
      fs.rmSync(runDir, { recursive: true, force: true });
      fs.rmSync(logDir, { recursive: true, force: true });
      fs.rmSync(path.join(baseDir, 'logs'), { recursive: true, force: true });
      fs.rmSync(path.join(baseDir, 'run'), { recursive: true, force: true });

      mm(process.env, 'EGG_APP_CONFIG', JSON.stringify({
        logger: {
          dir: logDir,
        },
        rundir: runDir,
      }));

      app = createApp('apps/config-env');
      await app.ready();
    });

    after(async () => {
      await app.close();
      fs.rmSync(runDir, { recursive: true, force: true });
      fs.rmSync(logDir, { recursive: true, force: true });
      fs.rmSync(path.join(baseDir, 'logs'), { recursive: true, force: true });
      fs.rmSync(path.join(baseDir, 'run'), { recursive: true, force: true });
    });
    afterEach(mm.restore);

    it('should custom dir', async () => {
      await scheduler.wait(1000);
      assertFile(path.join(runDir, 'application_config.json'));
      assertFile(path.join(logDir, 'egg-web.log'));
      assertFile.fail(path.join(baseDir, 'run/application_config.json'));
    });
  });

  describe('close()', () => {
    let app: MockApplication;
    beforeEach(() => {
      app = createApp('apps/demo');
      return app.ready();
    });

    afterEach(() => app.close());

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
      assert.equal(isAppClosed, true);
      assert.equal(isAgentClosed, true);
    });

    it('should close logger', async () => {
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
    });
  });

  describe('handle unhandledRejection', () => {
    let app: MockApplication;

    // use it to record create coverage codes time
    before('before: should cluster app ready', async () => {
      mm.env('prod');
      app = cluster('apps/app-throw');
      // app.coverage(true);
      await app.ready();
    });

    after(() => app.close());

    it('should handle unhandledRejection and log it', async () => {
      const req1 = app.httpRequest()
        .get('/throw-unhandledRejection')
        .expect('foo')
        .expect(200);
      const req2 = app.httpRequest()
        .get('/throw-unhandledRejection-string')
        .expect('foo')
        .expect(200);
      const req3 = app.httpRequest()
        .get('/throw-unhandledRejection-obj')
        .expect('foo')
        .expect(200);

      try {
        await Promise.race([ req1, req2, req3 ]);
      } catch (err) {
        console.error(err);
      }
      await scheduler.wait(3000);
      // const logFile = path.join(getFilepath('apps/app-throw'), 'logs/app-throw/common-error.log');
      // const body = fs.readFileSync(logFile, 'utf8');
      // assert.match(body, /nodejs\.unhandledRejectionError: foo reject error/);
      // assert.match(body, /nodejs\.unhandledRejectionError: foo reject string error/);
      // assert.match(body, /nodejs\.TypeError: foo reject obj error/);
      // // make sure stack exists and right
      // assert.match(body, /at .+router.js:\d+:\d+\)/);
    });
  });

  describe('BaseContextClass', () => {
    let app: MockApplication;
    before(() => {
      app = createApp('apps/base-context-class');
      return app.ready();
    });
    after(() => app.close());

    it('should access base context properties success', async () => {
      mm(app.config.logger, 'level', 'DEBUG');
      await app.httpRequest()
        .get('/')
        .expect('hello')
        .expect(200);

      await scheduler.wait(1000);

      const logPath = path.join(getFilepath('apps/base-context-class'), 'logs/base-context-class/base-context-class-web.log');
      const log = fs.readFileSync(logPath, 'utf8');
      assert(log.match(/INFO .*? \[service\.home\] appname: base-context-class/));
      assert(log.match(/INFO .*? \[controller\.home\] appname: base-context-class/));
      assert(log.match(/WARN .*? \[service\.home\] warn/));
      assert(log.match(/WARN .*? \[controller\.home\] warn/));
      const errorPath = path.join(getFilepath('apps/base-context-class'), 'logs/base-context-class/common-error.log');
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

  describe('egg-ready', () => {
    if (process.platform === 'win32') return;

    let app: MockApplication;

    before(() => {
      app = createApp('apps/demo');
    });

    after(() => app.close());

    it('should only trigger once', async () => {
      await app.ready();

      app.messenger.emit('egg-ready');
      app.messenger.emit('egg-ready');
      app.messenger.emit('egg-ready');

      assert(app.triggerCount === 1);
    });
  });

  describe('createAnonymousContext()', () => {
    if (process.platform === 'win32') return;

    let app: MockApplication;
    before(() => {
      app = createApp('apps/demo');
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
