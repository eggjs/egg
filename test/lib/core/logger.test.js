'use strict';

const should = require('should');
const path = require('path');
const fs = require('fs');
const mm = require('egg-mock');
const request = require('supertest');
const Logger = require('egg-logger');
const sleep = require('mz-modules/sleep');

const utils = require('../../utils');

describe('test/lib/core/logger.test.js', () => {

  let app;
  afterEach(mm.restore);
  afterEach(() => sleep(5000).then(() => app.close()));


  it('should got right default config on prod env', function* () {
    mm.env('prod');
    mm(process.env, 'EGG_LOG', '');
    mm(process.env, 'HOME', utils.getFilepath('apps/mock-production-app/config'));
    app = utils.app('apps/mock-production-app');
    yield app.ready();

    // 生产环境默认 _level = info
    app.logger.get('file').options.level.should.equal(Logger.INFO);
    // stdout 默认 INFO
    app.logger.get('console').options.level.should.equal(Logger.INFO);
    app.coreLogger.get('file').options.level.should.equal(Logger.INFO);
    app.coreLogger.get('console').options.level.should.equal(Logger.INFO);
  });

  it('should got right level on local env', function* () {
    mm.env('local');
    mm(process.env, 'EGG_LOG', '');
    app = utils.app('apps/mock-dev-app');
    yield app.ready();

    app.logger.get('file').options.level.should.equal(Logger.DEBUG);
    app.logger.get('console').options.level.should.equal(Logger.INFO);
    app.coreLogger.get('file').options.level.should.equal(Logger.DEBUG);
    app.coreLogger.get('console').options.level.should.equal(Logger.WARN);
  });

  it('should set EGG_LOG level on local env', function* () {
    mm.env('local');
    mm(process.env, 'EGG_LOG', 'ERROR');
    app = utils.app('apps/mock-dev-app');
    yield app.ready();

    app.logger.get('file').options.level.should.equal(Logger.DEBUG);
    app.logger.get('console').options.level.should.equal(Logger.ERROR);
    app.coreLogger.get('file').options.level.should.equal(Logger.DEBUG);
    app.coreLogger.get('console').options.level.should.equal(Logger.ERROR);
    return app.ready();
  });

  it('should got right config on unittest env', function* () {
    mm.env('unittest');
    mm(process.env, 'EGG_LOG', '');
    app = utils.app('apps/mock-dev-app');
    yield app.ready();

    app.logger.get('file').options.level.should.equal(Logger.INFO);
    app.logger.get('console').options.level.should.equal(Logger.WARN);
    app.coreLogger.get('file').options.level.should.equal(Logger.INFO);
    app.coreLogger.get('console').options.level.should.equal(Logger.WARN);
    return app.ready();
  });

  it('should set log.consoleLevel to env.EGG_LOG', function* () {
    mm(process.env, 'EGG_LOG', 'ERROR');
    app = utils.app('apps/mock-dev-app');
    yield app.ready();

    app.logger.get('file').options.level.should.equal(Logger.INFO);
    app.logger.get('console').options.level.should.equal(Logger.ERROR);
    return app.ready();
  });

  it('log buffer disable cache on local and unittest env', function* () {
    mm(process.env, 'EGG_LOG', 'NONE');
    app = utils.app('apps/nobuffer-logger');
    yield app.ready();

    const ctx = app.mockContext();
    const logfile = path.join(app.config.logger.dir, 'common-error.log');
    // app.config.logger.buffer.should.equal(false);
    ctx.logger.error(new Error('mock nobuffer error'));

    yield sleep(1000);

    fs.readFileSync(logfile, 'utf8').should.containEql('nodejs.Error: mock nobuffer error\n');
  });

  it('log buffer enable cache on non-local and non-unittest env', function* () {
    mm(process.env, 'EGG_LOG', 'none');
    mm.env('prod');
    mm(process.env, 'HOME', utils.getFilepath('apps/mock-production-app/config'));
    app = utils.app('apps/mock-production-app');
    yield app.ready();

    const ctx = app.mockContext();
    const logfile = path.join(app.config.logger.dir, 'common-error.log');
    // app.config.logger.buffer.should.equal(true);
    ctx.logger.error(new Error('mock enable buffer error'));

    yield sleep(1000);

    fs.readFileSync(logfile, 'utf8').should.containEql('');
  });

  it('output .json format log', function* () {
    mm(process.env, 'EGG_LOG', 'none');
    mm.env('local');
    app = utils.app('apps/logger-output-json');
    yield app.ready();

    const ctx = app.mockContext();
    const logfile = path.join(app.config.logger.dir, 'logger-output-json-web.json.log');
    ctx.logger.info('json format');

    yield sleep(1000);

    fs.existsSync(logfile).should.be.true;
    fs.readFileSync(logfile, 'utf8').should.containEql('"message":"json format"');
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
    const baseDir = utils.getFilepath('apps/logger');
    mm.env('default');
    mm(process.env, 'EGG_LOG', 'none');
    mm(process.env, 'EGG_HOME', baseDir);
    app = utils.cluster('apps/logger');
    app
    // .debug()
    .coverage(false)
    .end(err => {
      should.not.exists(err);
      const content = fs.readFileSync(path.join(baseDir, 'logs/logger/common-error.log'), 'utf8');
      content.should.containEql('nodejs.Error: agent error');
      content.should.containEql('nodejs.Error: app error');
      done();
    });
  });

  it('all loggers error should redirect to errorLogger', function* () {
    app = utils.app('apps/logger');
    yield app.ready();

    app.logger.error(new Error('logger error'));
    app.coreLogger.error(new Error('coreLogger error'));
    app.loggers.errorLogger.error(new Error('errorLogger error'));
    app.loggers.customLogger.error(new Error('customLogger error'));

    yield sleep(10);

    const content = fs.readFileSync(path.join(app.baseDir, 'logs/logger/common-error.log'), 'utf8');
    content.should.containEql('nodejs.Error: logger error');
    content.should.containEql('nodejs.Error: coreLogger error');
    content.should.containEql('nodejs.Error: errorLogger error');
    content.should.containEql('nodejs.Error: customLogger error');
  });

  it('agent\'s logger is same as coreLogger', function* () {
    app = utils.app('apps/logger');
    yield app.ready();

    app.agent.logger.options.file.should.equal(app.agent.coreLogger.options.file);
  });

  describe('logger.level = DEBUG', () => {
    let app;
    before(() => {
      app = utils.app('apps/logger-level-debug');
      return app.ready();
    });
    after(() => app.close());

    it('should save debug log to file', done => {
      request(app.callback())
      .get('/')
      .expect('ok')
      .end(err => {
        should.not.exist(err);
        fs.readFileSync(path.join(app.config.baseDir, 'logs/foo/foo-web.log'), 'utf8')
          .should.containEql(' DEBUG ');
        done();
      });
    });
  });
});
