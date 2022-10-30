const assert = require('assert');
const path = require('path');
const fs = require('fs');
const mm = require('egg-mock');
const Logger = require('egg-logger');
const utils = require('../../utils');

describe('test/lib/core/logger.test.js', () => {
  let app;
  afterEach(mm.restore);
  afterEach(() => utils.sleep(5000).then(() => app.close()));

  it('should got right default config on prod env', async () => {
    mm.env('prod');
    mm(process.env, 'EGG_LOG', '');
    mm(process.env, 'HOME', utils.getFilepath('apps/mock-production-app/config'));
    app = utils.app('apps/mock-production-app');
    await app.ready();

    // 生产环境默认 _level = info
    assert(app.logger.get('file').options.level === Logger.INFO);
    // stdout 默认 INFO
    assert(app.logger.get('console').options.level === Logger.INFO);
    assert(app.coreLogger.get('file').options.level === Logger.INFO);
    assert(app.coreLogger.get('console').options.level === Logger.INFO);
    assert(app.config.logger.disableConsoleAfterReady === true);
  });

  it('should got right level on prod env when set allowDebugAtProd to true', async () => {
    mm.env('prod');
    mm(process.env, 'EGG_LOG', '');
    mm(process.env, 'HOME', utils.getFilepath('apps/mock-production-app-do-not-force/config'));
    app = utils.app('apps/mock-production-app-do-not-force');
    await app.ready();

    assert(app.config.logger.allowDebugAtProd === true);

    assert(app.logger.get('file').options.level === Logger.DEBUG);
    assert(app.logger.get('console').options.level === Logger.INFO);
    assert(app.coreLogger.get('file').options.level === Logger.DEBUG);
    assert(app.coreLogger.get('console').options.level === Logger.INFO);
  });

  it('should got right level on local env', async () => {
    mm.env('local');
    mm(process.env, 'EGG_LOG', '');
    app = utils.app('apps/mock-dev-app');
    await app.ready();

    assert(app.logger.get('file').options.level === Logger.INFO);
    assert(app.logger.get('console').options.level === Logger.INFO);
    assert(app.coreLogger.get('file').options.level === Logger.INFO);
    assert(app.coreLogger.get('console').options.level === Logger.WARN);
    assert(app.config.logger.disableConsoleAfterReady === false);
  });

  it('should set EGG_LOG level on local env', async () => {
    mm.env('local');
    mm(process.env, 'EGG_LOG', 'ERROR');
    app = utils.app('apps/mock-dev-app');
    await app.ready();

    assert(app.logger.get('file').options.level === Logger.INFO);
    assert(app.logger.get('console').options.level === Logger.ERROR);
    assert(app.coreLogger.get('file').options.level === Logger.INFO);
    assert(app.coreLogger.get('console').options.level === Logger.ERROR);
    assert(app.config.logger.disableConsoleAfterReady === false);
  });

  it('should got right config on unittest env', async () => {
    mm.env('unittest');
    mm(process.env, 'EGG_LOG', '');
    app = utils.app('apps/mock-dev-app');
    await app.ready();

    assert(app.logger.get('file').options.level === Logger.INFO);
    assert(app.logger.get('console').options.level === Logger.WARN);
    assert(app.coreLogger.get('file').options.level === Logger.INFO);
    assert(app.coreLogger.get('console').options.level === Logger.WARN);
    assert(app.config.logger.disableConsoleAfterReady === false);
  });

  it('should set log.consoleLevel to env.EGG_LOG', async () => {
    mm(process.env, 'EGG_LOG', 'ERROR');
    app = utils.app('apps/mock-dev-app');
    await app.ready();

    assert(app.logger.get('file').options.level === Logger.INFO);
    assert(app.logger.get('console').options.level === Logger.ERROR);
    return app.ready();
  });

  it('log buffer disable cache on local and unittest env', async () => {
    mm(process.env, 'EGG_LOG', 'NONE');
    app = utils.app('apps/nobuffer-logger');
    await app.ready();
    assert(app.config.logger.disableConsoleAfterReady === false);

    const ctx = app.mockContext();
    const logfile = path.join(app.config.logger.dir, 'common-error.log');
    // app.config.logger.buffer.should.equal(false);
    ctx.logger.error(new Error('mock nobuffer error'));

    await utils.sleep(1000);

    assert(
      fs.readFileSync(logfile, 'utf8').includes('nodejs.Error: mock nobuffer error\n')
    );
  });

  it('log buffer enable cache on non-local and non-unittest env', async () => {
    mm(process.env, 'EGG_LOG', 'none');
    mm.env('prod');
    mm(process.env, 'HOME', utils.getFilepath('apps/mock-production-app/config'));
    app = utils.app('apps/mock-production-app');
    await app.ready();

    assert(app.config.logger.disableConsoleAfterReady === true);
    const ctx = app.mockContext();
    const logfile = path.join(app.config.logger.dir, 'common-error.log');
    // app.config.logger.buffer.should.equal(true);
    ctx.logger.error(new Error('mock enable buffer error'));

    await utils.sleep(1000);

    assert(fs.readFileSync(logfile, 'utf8').includes(''));
  });

  it('output .json format log', async () => {
    mm(process.env, 'EGG_LOG', 'none');
    mm.env('local');
    app = utils.app('apps/logger-output-json');
    await app.ready();

    const ctx = app.mockContext();
    const logfile = path.join(app.config.logger.dir, 'logger-output-json-web.json.log');
    ctx.logger.info('json format');

    await utils.sleep(2000);

    assert(fs.existsSync(logfile));
    assert(fs.readFileSync(logfile, 'utf8').includes('"message":"json format"'));
  });

  it('dont output to console after app ready', done => {
    mm.env('default');
    app = utils.cluster('apps/logger');
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
    app = utils.cluster('apps/logger');
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
    // unstable on Windows, skip it
    // https://github.com/eggjs/egg/runs/7977866117?check_suite_focus=true
    if (process.platform === 'win32') {
      return done();
    }
    const baseDir = utils.getFilepath('apps/logger');
    mm.env('default');
    mm(process.env, 'EGG_LOG', 'none');
    mm(process.env, 'EGG_HOME', baseDir);
    app = utils.cluster('apps/logger');
    app
    // .debug()
      .coverage(false)
      .end(err => {
        assert(!err);
        const content = fs.readFileSync(path.join(baseDir, 'logs/logger/common-error.log'), 'utf8');
        assert(content.includes('nodejs.Error: agent error'));
        assert(content.includes('nodejs.Error: app error'));
        done();
      });
  });

  it('all loggers error should redirect to errorLogger', async () => {
    app = utils.app('apps/logger');
    await app.ready();

    app.logger.error(new Error('logger error'));
    app.coreLogger.error(new Error('coreLogger error'));
    app.loggers.errorLogger.error(new Error('errorLogger error'));
    app.loggers.customLogger.error(new Error('customLogger error'));

    await utils.sleep(1000);

    const content = fs.readFileSync(path.join(app.baseDir, 'logs/logger/common-error.log'), 'utf8');
    assert(content.includes('nodejs.Error: logger error'));
    assert(content.includes('nodejs.Error: coreLogger error'));
    assert(content.includes('nodejs.Error: errorLogger error'));
    assert(content.includes('nodejs.Error: customLogger error'));
  });

  it('agent\'s logger is same as coreLogger', async () => {
    app = utils.app('apps/logger');
    await app.ready();

    assert(app.agent.logger.options.file === app.agent.coreLogger.options.file);
  });

  describe('logger.level = DEBUG', () => {
    let app;
    before(() => {
      app = utils.app('apps/logger-level-debug');
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
            fs.readFileSync(path.join(app.config.baseDir, 'logs/foo/foo-web.log'), 'utf8').includes(' DEBUG ')
          );
          done();
        });
    });
  });
});
