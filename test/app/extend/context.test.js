'use strict';

const fs = require('fs');
const path = require('path');
const mm = require('egg-mock');
const request = require('supertest');
const sleep = require('ko-sleep');
const assert = require('assert');
const utils = require('../../utils');

describe('test/app/extend/context.test.js', () => {
  afterEach(mm.restore);

  describe('ctx.logger', () => {
    let app;
    afterEach(() => app.close());

    it('env=local: level => debug', function* () {
      mm.env('local');
      mm.consoleLevel('NONE');
      app = utils.app('apps/demo', { cache: false });
      yield app.ready();
      const logdir = app.config.logger.dir;

      yield request(app.callback())
      .get('/logger?message=foo')
      .expect('logger');

      yield sleep(5000);

      const errorContent = fs.readFileSync(path.join(logdir, 'common-error.log'), 'utf8');
      errorContent.should.containEql('nodejs.Error: error foo');
      errorContent.should.containEql('nodejs.Error: core error foo');

      const loggerContent = fs.readFileSync(path.join(logdir, 'demo-web.log'), 'utf8');
      loggerContent.should.containEql('debug foo');
      loggerContent.should.containEql('info foo');
      loggerContent.should.containEql('warn foo');

      const coreLoggerContent = fs.readFileSync(path.join(logdir, 'egg-web.log'), 'utf8');
      coreLoggerContent.should.containEql('core debug foo');
      coreLoggerContent.should.containEql('core info foo');
      coreLoggerContent.should.containEql('core warn foo');
    });

    it('env=unittest: level => info', function* () {
      mm.env('unittest');
      mm.consoleLevel('NONE');
      app = utils.app('apps/demo', { cache: false });
      yield app.ready();
      const logdir = app.config.logger.dir;

      app.mockContext({
        userId: '123123',
      });

      yield request(app.callback())
      .get('/logger?message=foo')
      .expect('logger');

      yield sleep(5000);

      const errorContent = fs.readFileSync(path.join(logdir, 'common-error.log'), 'utf8');
      errorContent.should.containEql('nodejs.Error: error foo');
      errorContent.should.containEql('nodejs.Error: core error foo');
      errorContent.should.match(/\[123123\/[\d.]+\/-\/\d+ms GET \/logger\?message=foo]/);

      const loggerContent = fs.readFileSync(path.join(logdir, 'demo-web.log'), 'utf8');
      loggerContent.should.not.containEql('debug foo');
      loggerContent.should.containEql('info foo');
      loggerContent.should.containEql('warn foo');

      const coreLoggerContent = fs.readFileSync(path.join(logdir, 'egg-web.log'), 'utf8');
      coreLoggerContent.should.not.containEql('core debug foo');
      coreLoggerContent.should.containEql('core info foo');
      coreLoggerContent.should.containEql('core warn foo');
    });

    it('env=prod: level => info', function* () {
      mm.env('unittest');
      mm.consoleLevel('NONE');
      app = utils.app('apps/demo', { cache: false });
      yield app.ready();
      const logdir = app.config.logger.dir;

      yield request(app.callback())
      .get('/logger?message=foo')
      .expect('logger');

      yield sleep(5000);

      const errorContent = fs.readFileSync(path.join(logdir, 'common-error.log'), 'utf8');
      errorContent.should.containEql('nodejs.Error: error foo');
      errorContent.should.containEql('nodejs.Error: core error foo');

      const loggerContent = fs.readFileSync(path.join(logdir, 'demo-web.log'), 'utf8');
      loggerContent.should.not.containEql('debug foo');
      loggerContent.should.containEql('info foo');
      loggerContent.should.containEql('warn foo');

      const coreLoggerContent = fs.readFileSync(path.join(logdir, 'egg-web.log'), 'utf8');
      coreLoggerContent.should.not.containEql('core debug foo');
      coreLoggerContent.should.containEql('core info foo');
      coreLoggerContent.should.containEql('core warn foo');
    });
  });

  describe('ctx.getLogger', () => {
    let app;
    before(() => {
      app = utils.app('apps/get-logger');
      return app.ready();
    });
    after(() => app.close());

    it('should return null when logger is not found', () => {
      return request(app.callback())
      .get('/noExistLogger')
      .expect('null');
    });

    it('should log with padding message', function* () {
      yield request(app.callback())
        .get('/logger')
        .expect(200);

      yield sleep(100);
      const logPath = utils.getFilepath('apps/get-logger/logs/get-logger/a.log');
      fs.readFileSync(logPath, 'utf8').should.match(/\[-\/127.0.0.1\/-\/\d+ms GET \/logger] aaa/);
    });
  });

  describe('properties', () => {
    let app;
    before(() => {
      app = utils.app('apps/context-config-app');
      return app.ready();
    });
    after(() => app.close());

    describe('ctx.router', () => {
      it('should work', () => {
        return request(app.callback())
          .get('/')
          .expect(200)
          .expect('{"path":"/","foo":1,"bar":2}');
      });
    });
  });

  describe('ctx.locals', () => {
    let app;
    before(() => {
      app = utils.app('apps/locals');
      return app.ready();
    });
    after(() => app.close());

    it('should same this.locals ref on every request ', () => {
      return request(app.callback())
        .get('/ctx_same_ref')
        .expect('true');
    });

    it('should this.locals merge app.locals data', () => {
      return request(app.callback())
        .get('/ctx_merge_app')
        .expect({
          a: 1,
          b: 1,
        });
    });

    it('should this.locals cover app.locals data', () => {
      return request(app.callback())
        .get('/ctx_override_app')
        .expect({
          a: 'ctx.a',
          b: 'ctx.b',
        });
    });

    it('should not change this.locals data when app.locals change again', () => {
      return request(app.callback())
        .get('/ctx_app_update_can_not_affect_ctx')
        .expect({
          a: 'app.a',
          b: 'app.b',
          newPropertyExists: false,
        });
    });

    it('should locals only support object format', () => {
      return request(app.callback())
        .get('/set_only_support_object')
        .expect({
          'ctx.locals.object': true,
          'app.locals.object': true,
          'app.locals.string': false,
          'app.locals.number': false,
          'app.locals.function': false,
          'app.locals.array': false,
          'ctx.locals.string': false,
          'ctx.locals.number': false,
          'ctx.locals.function': false,
          'ctx.locals.array': false,
        });
    });
  });

  describe('ctx.runInBackground(scope)', () => {
    let app;
    before(() => {
      app = utils.app('apps/ctx-background');
      return app.ready();
    });
    after(() => app.close());

    it('should run background task success', function* () {
      yield request(app.callback())
        .get('/')
        .expect(200)
        .expect('hello');
      yield sleep(5000);
      const logdir = app.config.logger.dir;
      const log = fs.readFileSync(path.join(logdir, 'ctx-background-web.log'), 'utf8');
      log.should.match(/background run result file size: \d+/);
      fs.readFileSync(path.join(logdir, 'egg-web.log'), 'utf8')
        .should.match(/\[egg:background] task:saveUserInfo success \(\d+ms\)/);
    });

    it('should run background task error', function* () {
      mm.consoleLevel('NONE');
      yield request(app.callback())
        .get('/error')
        .expect(200)
        .expect('hello error');
      yield sleep(5000);
      const logdir = app.config.logger.dir;
      const log = fs.readFileSync(path.join(logdir, 'common-error.log'), 'utf8');
      log.should.match(/ENOENT: no such file or directory/);
      fs.readFileSync(path.join(logdir, 'egg-web.log'), 'utf8')
        .should.match(/\[egg:background] task:mockError fail \(\d+ms\)/);
    });
  });

  describe('tests on apps/demo', () => {
    let app;
    before(() => {
      app = utils.app('apps/demo');
      return app.ready();
    });
    after(() => app.close());

    describe('ctx.curl()', () => {
      it('should curl ok', function* () {
        const localServer = yield utils.startLocalServer();
        const context = app.mockContext();
        const res = yield context.curl(`${localServer}/foo/bar`);
        res.status.should.equal(200);
      });

      it('should curl as promise ok', () => {
        return utils.startLocalServer()
        .then(localServer => app.mockContext().curl(`${localServer}/foo/bar`))
        .then(res => res.status.should.equal(200));
      });
    });

    describe('ctx.httpclient', () => {
      it('should only one httpclient on one ctx', function* () {
        const ctx = app.mockContext();
        assert(ctx.httpclient === ctx.httpclient);
        assert(typeof ctx.httpclient.request === 'function');
        assert(typeof ctx.httpclient.curl === 'function');
      });
    });

    describe('ctx.realStatus', () => {
      it('should get from status ok', () => {
        const context = app.mockContext();
        context.status = 200;
        assert(context.realStatus === 200);
      });

      it('should get from realStatus ok', () => {
        const context = app.mockContext();
        context.status = 302;
        context.realStatus = 500;
        assert(context.realStatus === 500);
      });
    });

    describe('ctx.state', () => {
      it('should delegate ctx.locals', () => {
        const context = app.mockContext();
        context.locals = { a: 'a', b: 'b' };
        context.state = { a: 'aa', c: 'cc' };
        context.state.should.eql({ a: 'aa', b: 'b', c: 'cc' });
        context.state.should.equal(context.locals);
      });
    });

    describe('ctx.ip', () => {
      it('should get current request ip', () => {
        return request(app.callback())
          .get('/ip')
          .expect(200)
          .expect({
            ip: '127.0.0.1',
          });
      });

      it('should set current request ip', () => {
        return request(app.callback())
          .get('/ip?set_ip=10.2.2.2')
          .expect(200)
          .expect({
            ip: '10.2.2.2',
          });
      });
    });

    describe('get helper()', () => {
      it('should be the same helper instance', () => {
        const ctx = app.mockContext();
        assert(ctx.helper === ctx.helper);
      });
    });

    describe('getLogger()', () => {
      it('should return null when logger name not exists', () => {
        const ctx = app.mockContext();
        assert(ctx.getLogger('not-exist-logger') === null);
      });

      it('should return same logger instance', () => {
        const ctx = app.mockContext();
        assert(ctx.getLogger('coreLogger') === ctx.getLogger('coreLogger'));
      });
    });
  });
});
