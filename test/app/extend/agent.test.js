'use strict';

const assert = require('assert');

const mm = require('egg-mock');
const utils = require('../../utils');

describe('test/app/extend/agent.test.js', () => {
  afterEach(mm.restore);

  describe('agent.addSingleton()', () => {
    let app;
    before(() => {
      app = utils.app('apps/singleton-demo');
      return app.ready();
    });
    after(() => app.close());

    it('should add singleton success', function* () {
      let config = yield app.agent.dataService.get('second').getConfig();
      assert(config.foo === 'bar');
      assert(config.foo2 === 'bar2');

      const ds = app.agent.dataService.createInstance({ foo: 'barrr' });
      config = yield ds.getConfig();
      assert(config.foo === 'barrr');
    });
  });

  describe('agent.createAnonymousContext()', () => {
    let app;
    before(() => {
      app = utils.app('apps/demo');
      return app.ready();
    });
    after(() => app.close());

    it('should get anonymous context object', function* () {
      const ctx = app.agent.createAnonymousContext({
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

});
