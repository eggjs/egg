'use strict';

const moment = require('moment');
const should = require('should');
const path = require('path');
const fs = require('fs');
const mm = require('egg-mock');
const request = require('supertest');
const Logger = require('egg-logger');
const utils = require('../../utils');
const Agent = require('../../..').Agent;

describe('test/lib/core/logger.test.js', () => {
  afterEach(mm.restore);

  it('should got right default config on prod env', () => {
    mm.env('prod');
    mm(process.env, 'EGG_LOG', '');
    mm(process.env, 'HOME', utils.getFilepath('apps/mock-production-app/config'));
    const app = utils.app('apps/mock-production-app');
    // 生产环境默认 _level = info
    app.logger.get('file').options.level.should.equal(Logger.INFO);
    // stdout 默认 INFO
    app.logger.get('console').options.level.should.equal(Logger.INFO);
    app.coreLogger.get('file').options.level.should.equal(Logger.INFO);
    app.coreLogger.get('console').options.level.should.equal(Logger.INFO);
    app.close();
  });

  it('should got right level on local env', () => {
    mm.env('local');
    mm(process.env, 'EGG_LOG', '');
    const app = utils.app('apps/mock-dev-app');

    app.logger.get('file').options.level.should.equal(Logger.DEBUG);
    app.logger.get('console').options.level.should.equal(Logger.INFO);
    app.coreLogger.get('file').options.level.should.equal(Logger.DEBUG);
    app.coreLogger.get('console').options.level.should.equal(Logger.WARN);
    app.close();
  });

  it('should set EGG_LOG level on local env', () => {
    mm.env('local');
    mm(process.env, 'EGG_LOG', 'ERROR');
    const app = utils.app('apps/mock-dev-app');
    app.logger.get('file').options.level.should.equal(Logger.DEBUG);
    app.logger.get('console').options.level.should.equal(Logger.ERROR);
    app.coreLogger.get('file').options.level.should.equal(Logger.DEBUG);
    app.coreLogger.get('console').options.level.should.equal(Logger.ERROR);
    app.close();
  });

  it('should got right config on unittest env', () => {
    mm.env('unittest');
    mm(process.env, 'EGG_LOG', '');
    const app = utils.app('apps/mock-dev-app');
    app.logger.get('file').options.level.should.equal(Logger.INFO);
    app.logger.get('console').options.level.should.equal(Logger.WARN);
    app.coreLogger.get('file').options.level.should.equal(Logger.INFO);
    app.coreLogger.get('console').options.level.should.equal(Logger.WARN);
    app.close();
  });

  it('should set log.consoleLevel to env.EGG_LOG', () => {
    mm(process.env, 'EGG_LOG', 'ERROR');
    const app = utils.app('apps/mock-dev-app');
    app.logger.get('file').options.level.should.equal(Logger.INFO);
    app.logger.get('console').options.level.should.equal(Logger.ERROR);
    app.close();
  });

  it('log buffer disable cache on local and unittest env', done => {
    mm(process.env, 'EGG_LOG', 'NONE');
    const app = utils.app('apps/nobuffer-logger');
    app.ready(() => {
      const ctx = app.mockContext();
      const logfile = path.join(app.config.logger.dir, 'common-error.log');
      // app.config.logger.buffer.should.equal(false);
      ctx.logger.error(new Error('mock nobuffer error'));
      setTimeout(() => {
        app.close();
        fs.readFileSync(logfile, 'utf8').should.containEql('nodejs.Error: mock nobuffer error\n');
        done();
      }, 1000);
    });
  });

  it('log buffer enable cache on non-local and non-unittest env', done => {
    mm(process.env, 'EGG_LOG', 'none');
    mm.env('prod');
    mm(process.env, 'HOME', utils.getFilepath('apps/mock-production-app/config'));
    const app = utils.app('apps/mock-production-app');
    app.ready(() => {
      const ctx = app.mockContext();
      const logfile = path.join(app.config.logger.dir, 'common-error.log');
      // app.config.logger.buffer.should.equal(true);
      ctx.logger.error(new Error('mock enable buffer error'));
      setTimeout(() => {
        app.close();
        fs.readFileSync(logfile, 'utf8').should.containEql('');
        done();
      }, 1000);
    });
  });

  it('output .json format log', done => {
    mm(process.env, 'EGG_LOG', 'none');
    mm.env('local');
    const app = utils.app('apps/logger-output-json');
    app.ready(() => {
      const ctx = app.mockContext();
      const logfile = path.join(app.config.logger.dir, 'logger-output-json-web.json.log');
      ctx.logger.info('json format');
      setTimeout(() => {
        app.close();
        fs.existsSync(logfile).should.be.true;
        fs.readFileSync(logfile, 'utf8').should.containEql('"message":"json format"');
        done();
      }, 1000);
    });
  });

  it('dont output to console after app ready', done => {
    mm.env('default');
    const app = utils.cluster('apps/logger');
    app
    .debug(false)
    .coverage(false)
    .expect('stdout', /agent info/)
    .expect('stdout', /app info/)
    .notExpect('stdout', /app info after ready/)
    .expect('stderr', /nodejs.Error: agent error/)
    .expect('stderr', /nodejs.Error: app error/)
    .end(err => {
      app.close();
      should.not.exists(err);
      done();
    });
  });

  it('should still output to console after app ready on local env', done => {
    mm.env('local');
    const app = utils.cluster('apps/logger');
    app
    // .debug()
    .coverage(false)
    .expect('stdout', /agent info/)
    .expect('stdout', /app info/)
    .expect('stdout', /app info after ready/)
    .expect('stderr', /nodejs.Error: agent error/)
    .expect('stderr', /nodejs.Error: app error/)
    .end(err => {
      app.close();
      should.not.exists(err);
      done();
    });
  });

  it('agent and app error should output to common-error.log', done => {
    const baseDir = utils.getFilepath('apps/logger');
    mm.env('default');
    mm(process.env, 'EGG_LOG', 'none');
    mm(process.env, 'HOME', baseDir);
    const app = utils.cluster('apps/logger');
    app
    // .debug()
    .coverage(false)
    .end(err => {
      app.close();
      should.not.exists(err);
      const content = fs.readFileSync(path.join(baseDir, 'logs/logger/common-error.log'), 'utf8');
      content.should.containEql('nodejs.Error: agent error');
      content.should.containEql('nodejs.Error: app error');
      done();
    });
  });

  it('all loggers error should redirect to errorLogger', done => {
    const app = utils.app('apps/logger');
    app.ready(() => {
      app.logger.error(new Error('logger error'));
      app.coreLogger.error(new Error('coreLogger error'));
      app.loggers.errorLogger.error(new Error('errorLogger error'));
      app.loggers.customLogger.error(new Error('customLogger error'));

      setTimeout(() => {
        app.close();
        const content = fs.readFileSync(path.join(app.baseDir, 'logs/logger/common-error.log'), 'utf8');
        content.should.containEql('nodejs.Error: logger error');
        content.should.containEql('nodejs.Error: coreLogger error');
        content.should.containEql('nodejs.Error: errorLogger error');
        content.should.containEql('nodejs.Error: customLogger error');
        done();
      }, 10);
    });
  });

  it('agent\'s logger is same as coreLogger', done => {
    const agent = new Agent({
      baseDir: utils.getFilepath('apps/logger'),
    });
    agent.logger.options.file.should.equal(agent.coreLogger.options.file);
    agent.ready(done);
  });

  describe.skip('logger.reload()', () => {
    let app;
    before(() => {
      mm(process.env, 'EGG_LOG', 'none');
      app = utils.cluster('apps/logger-reload');
      return app.ready();
    });

    after(() => app.close());

    it('should reload worker loggers', done => {
      request(app.callback())
      .get('/')
      .expect({
        method: 'GET',
        path: '/',
      })
      .expect(200, err => {
        should.not.exist(err);
        app.process.send({
          to: 'agent',
          action: 'test-reload-logger',
        });
        setTimeout(() => {
          const logname = moment().subtract(1, 'days').format('.YYYY-MM-DD');
          const logfile1 = utils.getFilepath('apps/logger-reload/logs/logger-reload/logger-reload-web.log');
          const content1 = fs.readFileSync(logfile1, 'utf8');
          content1.should.equal('');

          const logfile2 = utils.getFilepath(`apps/logger-reload/logs/logger-reload/logger-reload-web.log${logname}`);
          const content2 = fs.readFileSync(logfile2, 'utf8');
          content2.should.containEql('GET /');

          const logfile3 = utils.getFilepath(`apps/logger-reload/logs/logger-reload/egg-agent.log${logname}`);
          fs.existsSync(logfile3).should.be.true;
          done();
        }, 2000);
      });
    });
  });

  describe('logger.level = DEBUG', () => {
    let app;
    before(done => {
      app = utils.app('apps/logger-level-debug');
      app.ready(done);
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
