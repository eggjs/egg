'use strict';

const assert = require('assert');

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
      assert(app.logger === app.loggers.logger);
    });

    it('should alias app.coreLooger => app.loggers.coreLooger', () => {
      assert(app.coreLogger === app.loggers.coreLogger);
    });

    it('should alias app.getLogger(\'coreLogger\') => app.loggers.coreLooger', () => {
      assert(app.getLogger('coreLogger') === app.loggers.coreLogger);
    });

    it('should alias app.getLogger(\'noexist\') => null', () => {
      assert(app.getLogger('noexist') === null);
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
      assert([
        'name', 'baseDir',
        'env', 'subdomainOffset',
        'controller', 'middlewares', 'serviceClasses',
        'config', 'httpclient', 'loggers',
      ].every(p => Object.prototype.hasOwnProperty.call(app.inspect(), p)));
      assert(app.inspect().name === 'demo');
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
      assert(ctx.ip === '10.0.0.1');
      assert(ctx.url === '/foobar?ok=1');
      assert(ctx.socket.remoteAddress === '10.0.0.1');
      assert(ctx.socket.remotePort === 7001);
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
      assert(config.foo === 'bar');
      assert(config.foo1 === 'bar1');

      const ds = app.dataService.createInstance({ foo: 'barrr' });
      config = yield ds.getConfig();
      assert(config.foo === 'barrr');
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
      assert(/mock background run at app result file size: \d+/.test(log));
      assert(
        /\[egg:background] task:saveUserInfo success \(\d+ms\)/.test(fs.readFileSync(path.join(logdir, 'egg-web.log'), 'utf8'))
      );
    });
  });
});
