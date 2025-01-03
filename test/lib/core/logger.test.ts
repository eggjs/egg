import { strict as assert } from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import { scheduler } from 'node:timers/promises';
import { mm } from '@eggjs/mock';
import { levels } from 'egg-logger';
import { MockApplication, createApp, cluster, getFilepath } from '../../utils.js';

describe('test/lib/core/logger.test.ts', () => {
  let app: MockApplication;
  afterEach(async () => {
    if (app && !app.isClosed) {
      await scheduler.wait(500);
      await app.close();
    }
    await mm.restore();
  });

  it('should got right default config on prod env', async () => {
    mm.env('prod');
    mm(process.env, 'EGG_LOG', '');
    mm(process.env, 'HOME', getFilepath('apps/mock-production-app/config'));
    app = createApp('apps/mock-production-app');
    await app.ready();

    // 生产环境默认 _level = info
    assert((app.logger.get('file') as any).options.level === levels.INFO);
    // stdout 默认 INFO
    assert((app.logger.get('console') as any).options.level === levels.INFO);
    assert((app.coreLogger.get('file') as any).options.level === levels.INFO);
    assert((app.coreLogger.get('console') as any).options.level === levels.INFO);
    assert(app.config.logger.disableConsoleAfterReady === true);
  });

  it('should got right level on prod env when set allowDebugAtProd to true', async () => {
    mm.env('prod');
    mm(process.env, 'EGG_LOG', '');
    mm(process.env, 'HOME', getFilepath('apps/mock-production-app-do-not-force/config'));
    app = createApp('apps/mock-production-app-do-not-force');
    await app.ready();

    assert(app.config.logger.allowDebugAtProd === true);

    assert((app.logger.get('file') as any).options.level === levels.DEBUG);
    assert((app.logger.get('console') as any).options.level === levels.INFO);
    assert((app.coreLogger.get('file') as any).options.level === levels.DEBUG);
    assert((app.coreLogger.get('console') as any).options.level === levels.INFO);
  });

  it('should got right level on local env', async () => {
    mm.env('local');
    mm(process.env, 'EGG_LOG', '');
    app = createApp('apps/mock-dev-app');
    await app.ready();

    assert((app.logger.get('file') as any).options.level === levels.INFO);
    assert((app.logger.get('console') as any).options.level === levels.INFO);
    assert((app.coreLogger.get('file') as any).options.level === levels.INFO);
    assert((app.coreLogger.get('console') as any).options.level === levels.WARN);
    assert(app.config.logger.disableConsoleAfterReady === false);
  });

  it('should set EGG_LOG level on local env', async () => {
    mm.env('local');
    mm(process.env, 'EGG_LOG', 'ERROR');
    app = createApp('apps/mock-dev-app');
    await app.ready();

    assert((app.logger.get('file') as any).options.level === levels.INFO);
    assert((app.logger.get('console') as any).options.level === levels.ERROR);
    assert((app.coreLogger.get('file') as any).options.level === levels.INFO);
    assert((app.coreLogger.get('console') as any).options.level === levels.ERROR);
    assert(app.config.logger.disableConsoleAfterReady === false);
  });

  it('should got right config on unittest env', async () => {
    mm.env('unittest');
    mm(process.env, 'EGG_LOG', '');
    app = createApp('apps/mock-dev-app');
    await app.ready();

    assert((app.logger.get('file') as any).options.level === levels.INFO);
    assert((app.logger.get('console') as any).options.level === levels.WARN);
    assert((app.coreLogger.get('file') as any).options.level === levels.INFO);
    assert((app.coreLogger.get('console') as any).options.level === levels.WARN);
    assert(app.config.logger.disableConsoleAfterReady === false);
  });

  it('should set log.consoleLevel to env.EGG_LOG', async () => {
    mm(process.env, 'EGG_LOG', 'ERROR');
    app = createApp('apps/mock-dev-app');
    await app.ready();

    assert((app.logger.get('file') as any).options.level === levels.INFO);
    assert((app.logger.get('console') as any).options.level === levels.ERROR);
    return app.ready();
  });

  it('log buffer disable cache on local and unittest env', async () => {
    mm(process.env, 'EGG_LOG', 'NONE');
    app = createApp('apps/nobuffer-logger');
    await app.ready();
    assert(app.config.logger.disableConsoleAfterReady === false);

    const ctx = app.mockContext();
    const logfile = path.join(app.config.logger.dir, 'common-error.log');
    // app.config.logger.buffer.should.equal(false);
    ctx.logger.error(new Error('mock nobuffer error on logger'));
    ctx.coreLogger.error(new Error('mock nobuffer error on coreLogger'));
    await scheduler.wait(1000);
    if (process.platform !== 'darwin') {
      // skip check on macOS
      const content = fs.readFileSync(logfile, 'utf8');
      assert.match(content, /nodejs\.Error: mock nobuffer error on logger/);
      assert.match(content, /nodejs\.Error: mock nobuffer error on coreLogger/);
    }
  });

  it('log buffer enable cache on non-local and non-unittest env', async () => {
    mm(process.env, 'EGG_LOG', 'none');
    mm.env('prod');
    mm(process.env, 'HOME', getFilepath('apps/mock-production-app/config'));
    app = createApp('apps/mock-production-app');
    await app.ready();

    assert(app.config.logger.disableConsoleAfterReady === true);
    const ctx = app.mockContext();
    const logfile = path.join(app.config.logger.dir, 'common-error.log');
    // app.config.logger.buffer.should.equal(true);
    ctx.logger.error(new Error('mock enable buffer error'));

    await scheduler.wait(1000);

    assert(fs.readFileSync(logfile, 'utf8').includes(''));
  });

  it('output .json format log', async () => {
    mm(process.env, 'EGG_LOG', 'none');
    mm.env('local');
    app = createApp('apps/logger-output-json');
    await app.ready();

    const ctx = app.mockContext();
    const logfile = path.join(app.config.logger.dir, 'logger-output-json-web.json.log');
    ctx.logger.info('json format');

    await scheduler.wait(2000);

    assert(fs.existsSync(logfile));
    assert(fs.readFileSync(logfile, 'utf8').includes('"message":"json format"'));
  });

  it('dont output to console after app ready', done => {
    mm.env('default');
    app = cluster('apps/logger');
    app
      .debug(false)
      .coverage(false)
      .expect('stdout', /agent info/)
      .expect('stdout', /app info/)
      .notExpect('stdout', /app info after ready/)
      .expect('stderr', /nodejs.Error: agent error/)
      .expect('stderr', /nodejs.Error: app error/)
      .end(done);
  });

  it('should still output to console after app ready on local env', done => {
    mm.env('local');
    app = cluster('apps/logger');
    app
      // .debug()
      .coverage(false)
      .expect('stdout', /agent info/)
      .expect('stdout', /app info/)
      .expect('stdout', /app info after ready/)
      .expect('stderr', /nodejs.Error: agent error/)
      .expect('stderr', /nodejs.Error: app error/)
      .end(done);
  });

  it('agent and app error should output to common-error.log', done => {
    const baseDir = getFilepath('apps/logger');
    mm.env('default');
    mm(process.env, 'EGG_LOG', 'none');
    mm(process.env, 'EGG_HOME', baseDir);
    app = cluster('apps/logger');
    app
      // .debug()
      .coverage(false)
      .end(async (err: any) => {
        await scheduler.wait(1000);
        assert(!err);
        const content = fs.readFileSync(path.join(baseDir, 'logs/logger/common-error.log'), 'utf8');
        assert(content.includes('nodejs.Error: agent error'));
        assert(content.includes('nodejs.Error: app error'));
        done();
      });
  });

  it('all loggers error should redirect to errorLogger', async () => {
    app = createApp('apps/logger');
    await app.ready();

    app.logger.error(new Error('logger error'));
    app.coreLogger.error(new Error('coreLogger error'));
    app.loggers.errorLogger.error(new Error('errorLogger error'));
    app.loggers.customLogger.error(new Error('customLogger error'));

    await scheduler.wait(1000);

    const content = fs.readFileSync(path.join(app.baseDir, 'logs/logger/common-error.log'), 'utf8');
    assert(content.includes('nodejs.Error: logger error'));
    assert(content.includes('nodejs.Error: coreLogger error'));
    assert(content.includes('nodejs.Error: errorLogger error'));
    assert(content.includes('nodejs.Error: customLogger error'));
  });

  it('agent\'s logger is same as coreLogger', async () => {
    app = createApp('apps/logger');
    await app.ready();

    assert(app.agent.logger.options.file === app.agent.coreLogger.options.file);
  });

  it('should `config.logger.enableFastContextLogger` = true work', async () => {
    app = createApp('apps/app-enableFastContextLogger');
    await app.ready();
    app.mockContext({
      tracer: {
        traceId: 'mock-trace-id-123',
      },
    });
    await app.httpRequest()
      .get('/')
      .expect(200)
      .expect({
        enableFastContextLogger: true,
      });
    await scheduler.wait(1000);
    app.expectLog(/ INFO \d+ \[-\/127\.0\.0\.1\/mock-trace-id-123\/[\d\.]+ms GET \/] enableFastContextLogger: true/);
  });

  describe('logger.level = DEBUG', () => {
    let app: MockApplication;
    before(() => {
      app = createApp('apps/logger-level-debug');
      return app.ready();
    });
    after(() => app.close());

    it('should save debug log to file', done => {
      app.httpRequest()
        .get('/')
        .expect('ok')
        .end(err => {
          assert(!err);
          assert(
            fs.readFileSync(path.join(app.config.baseDir, 'logs/foo/foo-web.log'), 'utf8').includes(' DEBUG '),
          );
          done();
        });
    });
  });

  describe('onelogger', () => {
    let app: MockApplication;
    before(() => {
      app = createApp('apps/custom-logger');
      return app.ready();
    });
    after(() => app.close());

    it('should work with onelogger', async () => {
      await app.httpRequest()
        .get('/')
        .expect({
          ok: true,
        })
        .expect(200);
      await scheduler.wait(1000);
      app.expectLog('[custom-logger-label] hello myLogger', 'myLogger');
      app.expectLog('hello logger');
    });
  });
});
