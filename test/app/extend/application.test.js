'use strict';

const request = require('supertest');
const mm = require('egg-mock');
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
        'config', 'urllib', 'loggers',
      ]);
      app.inspect().name.should.equal('demo');
    });
  });

  describe('app.readyCallback()', () => {
    let app;
    after(() => app.close());

    it('should log info when plugin is not ready', done => {
      app = utils.app('apps/notready');
      mm(app.console, 'warn', (message, a) => {
        message.should.eql('[egg:core:ready_timeout] 10 seconds later %s was still unable to finish.');
        a.should.eql('a');
        done();
      });
      app.ready(() => {
        throw new Error('should not be called');
      });
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
});
