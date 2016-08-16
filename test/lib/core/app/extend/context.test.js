'use strict';

const should = require('should');
const fs = require('fs');
const path = require('path');
const mm = require('egg-mock');
const request = require('supertest');
const rimraf = require('rimraf');
const utils = require('../../../../utils');

describe('test/lib/core/app/extend/context.test.js', () => {

  afterEach(mm.restore);

  describe('ctx.logger', () => {
    const baseDir = utils.getFilepath('apps/demo');

    beforeEach(() => {
      rimraf.sync(path.join(baseDir, 'logs'));
    });

    let app;
    afterEach(() => app.close());

    it('env=local: level => debug', done => {
      mm.env('local');
      mm(process.env, 'EGG_LOG', 'none');
      app = utils.app('apps/demo');
      const logdir = app.config.logger.dir;

      request(app.callback())
      .get('/logger?message=foo')
      .expect('logger', err => {
        should.not.exists(err);

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
        done();
      });
    });

    it('env=unittest: level => info', done => {
      mm.env('unittest');
      app = utils.app('apps/demo');
      app.ready(() => {
        const logdir = app.config.logger.dir;

        app.mockContext({
          userId: '123123',
          tracer: {
            traceId: '456456',
          },
        });

        request(app.callback())
        .get('/logger?message=foo')
        .expect('logger', err => {
          should.not.exists(err);

          const errorContent = fs.readFileSync(path.join(logdir, 'common-error.log'), 'utf8');
          errorContent.should.containEql('nodejs.Error: error foo');
          errorContent.should.containEql('nodejs.Error: core error foo');
          errorContent.should.match(/\[123123\/[\d\.]+\/456456\/\d+ms GET \/logger\?message=foo]/);

          const loggerContent = fs.readFileSync(path.join(logdir, 'demo-web.log'), 'utf8');
          loggerContent.should.not.containEql('debug foo');
          loggerContent.should.containEql('info foo');
          loggerContent.should.containEql('warn foo');

          const coreLoggerContent = fs.readFileSync(path.join(logdir, 'egg-web.log'), 'utf8');
          coreLoggerContent.should.not.containEql('core debug foo');
          coreLoggerContent.should.containEql('core info foo');
          coreLoggerContent.should.containEql('core warn foo');

          done();
        });
      });
    });

    it('env=prod: level => info', done => {
      mm.env('unittest');
      app = utils.app('apps/demo');
      const logdir = app.config.logger.dir;

      request(app.callback())
      .get('/logger?message=foo')
      .expect('logger', err => {
        should.not.exists(err);

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

        done();
      });
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

    describe('ctx.runtime', () => {
      it('should work', () => {
        return request(app.callback())
          .get('/runtime')
          .expect(200)
          .expect('{"mysql":10,"foo":11}');
      });
    });
  });

  describe('ctx.instrument(event, action), app.instrument(event, action)', () => {
    let app;
    before(() => {
      mm.env('local');
      app = utils.app('apps/context-config-app');
      return app.ready();
    });
    after(() => app.close());

    it('should instrument whatever you want', done => {
      const ctx = app.mockContext();
      mm(ctx.logger, 'info', msg => {
        msg.should.match(/\[foo\] test action on ctx \d+ms/);
        done();
      });
      const ins = ctx.instrument('foo', 'test action on ctx');
      ins.end();
    });

    it('should app.instrument work', done => {
      mm(app.logger, 'info', msg => {
        msg.should.match(/\[foo\] test action on app \d+ms/);
        done();
      });
      const ins = app.instrument('foo', 'test action on app');
      ins.end();
    });
  });

  describe('ctx.view', () => {
    let app;
    before(() => {
      app = utils.cluster({
        baseDir: 'apps/view',
        customEgg: utils.getFilepath('apps/view-framework'),
      });
      return app.ready();
    });
    after(() => app.close());

    it('should render template', () => {
      return request(app.callback())
        .get('/')
        .expect(200)
        .expect('name=index.html, a=111, b=b, c=testHelper');
    });

    it('should render string', () => {
      return request(app.callback())
        .get('/string')
        .expect(200)
        .expect('tpl={{a}}, a=111, b=b, c=testHelper');
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

  describe('ctx.roleFailureHandler()', () => {
    it('should detect ajax', function* () {
      const context = yield utils.createContext({ isAjax: true });
      context.roleFailureHandler('admin');
      context.body.should.eql({ message: 'Forbidden, required role: admin', stat: 'deny' });
    });

    it('should response message when is not ajax', function* () {
      const context = yield utils.createContext();
      context.roleFailureHandler('admin');
      context.body.should.equal('Forbidden, required role: admin');
    });
  });

  describe('ctx.curl()', () => {
    it('should curl ok', function* () {
      const context = yield utils.createContext();
      const res = yield context.curl('https://a.alipayobjects.com/aliBridge/1.0.0/aliBridge.min.js');
      res.status.should.equal(200);
    });
  });

  describe('ctx.realStatus', () => {
    it('should get from status ok', function* () {
      const context = yield utils.createContext();
      context.status = 200;
      context.realStatus.should.equal(200);
    });

    it('should get from realStatus ok', () => {
      const context = utils.createContext();
      context.status = 302;
      context.realStatus = 500;
      context.realStatus.should.equal(500);
    });
  });

  describe('ctx.state', () => {
    it('should delegate ctx.locals', function* () {
      const context = yield utils.createContext();
      context.locals = { a: 'a', b: 'b' };
      context.state = { a: 'aa', c: 'cc' };
      context.state.should.eql({ a: 'aa', b: 'b', c: 'cc' });
      context.state.should.equal(context.locals);
    });
  });
});
