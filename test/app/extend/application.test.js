'use strict';

const request = require('supertest');
const sleep = require('mz-modules/sleep');
const fs = require('fs');
const path = require('path');
const utils = require('../../utils');

describe('test/app/extend/application.test.js', () => {
  describe('app.logger', () => {
    let app;
    before(() => {
      app = utils.app('apps/demo');
      return app.ready();
    });
    after(() => app.close());

    it('should alias app.logger => app.loggers.logger', () => {
      app.logger.should.equal(app.loggers.logger);
    });

    it('should alias app.coreLooger => app.loggers.coreLooger', () => {
      app.coreLogger.should.equal(app.loggers.coreLogger);
    });

    it('should alias app.getLogger(\'coreLogger\') => app.loggers.coreLooger', () => {
      app.getLogger('coreLogger').should.equal(app.loggers.coreLogger);
    });

    it('should alias app.getLogger(\'noexist\') => null', () => {
      (app.getLogger('noexist') === null).should.be.true();
    });
  });

  describe('app.inspect()', () => {
    let app;
    before(() => {
      app = utils.app('apps/demo');
      return app.ready();
    });
    after(() => app.close());

    it('should inspect app properties', () => {
      app.inspect().should.have.properties([
        'name', 'baseDir',
        'env', 'subdomainOffset',
        'controller', 'middlewares', 'serviceClasses',
        'config', 'httpclient', 'loggers',
      ]);
      app.inspect().name.should.equal('demo');
    });
  });

  describe('app.readyCallback()', () => {
    let app;
    after(() => app.close());

    it('should log info when plugin is not ready', function* () {
      app = utils.cluster('apps/notready');
      // it won't be ready, so wait for the timeout
      yield sleep(11000);

      app.expect('stderr', /\[egg:core:ready_timeout] 10 seconds later a was still unable to finish./);
    });
  });

  describe('app.locals', () => {
    let app;
    before(() => {
      app = utils.app('apps/locals');
      return app.ready();
    });
    after(() => app.close());

    it('should app.locals is same ref', () => {
      return request(app.callback())
        .get('/app_same_ref')
        .expect('true');
    });
  });

  describe('app.createAnonymousContext()', () => {
    let app;
    before(() => {
      app = utils.app('apps/demo');
      return app.ready();
    });
    after(() => app.close());

    it('should get anonymous context object', function* () {
      const ctx = app.createAnonymousContext({
        socket: {
          remoteAddress: '10.0.0.1',
        },
        headers: {
          'x-forwarded-for': '10.0.0.1',
        },
        url: '/foobar?ok=1',
      });
      ctx.ip.should.equal('10.0.0.1');
      ctx.url.should.equal('/foobar?ok=1');
      ctx.socket.remoteAddress.should.equal('10.0.0.1');
      ctx.socket.remotePort.should.equal(7001);
    });
  });

  describe('app.addSingleton()', () => {
    let app;
    before(() => {
      app = utils.app('apps/singleton-demo');
      return app.ready();
    });
    after(() => app.close());

    it('should add singleton success', function* () {
      let config = yield app.dataService.get('first').getConfig();
      config.foo.should.equal('bar');
      config.foo1.should.equal('bar1');

      const ds = yield app.dataService.createInstance({ foo: 'barrr' });
      config = yield ds.getConfig();
      config.foo.should.equal('barrr');
    });
  });

  describe('app.runInBackground(scope)', () => {
    let app;
    before(() => {
      app = utils.app('apps/ctx-background');
      return app.ready();
    });
    after(() => app.close());

    it('should run background task success', function* () {
      yield request(app.callback())
        .get('/app_background')
        .expect(200)
        .expect('hello app');
      yield sleep(5000);
      const logdir = app.config.logger.dir;
      const log = fs.readFileSync(path.join(logdir, 'ctx-background-web.log'), 'utf8');
      log.should.match(/mock background run at app result file size: \d+/);
      fs.readFileSync(path.join(logdir, 'egg-web.log'), 'utf8')
        .should.match(/\[egg:background] task:saveUserInfo success \(\d+ms\)/);
    });
  });
});
