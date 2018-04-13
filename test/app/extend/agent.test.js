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

    it('should add singleton success', async () => {
      let config = await app.dataService.get('first').getConfig();
      assert(config.foo === 'bar');
      assert(config.foo1 === 'bar1');

      const ds = app.dataService.createInstance({ foo: 'barrr' });
      config = await ds.getConfig();
      assert(config.foo === 'barrr');

      const ds2 = await app.dataService.createInstanceAsync({ foo: 'barrr' });
      config = await ds2.getConfig();
      assert(config.foo === 'barrr');

      config = await app.dataServiceAsync.get('first').getConfig();
      assert(config.foo === 'bar');
      assert(config.foo1 === 'bar1');

      try {
        app.dataServiceAsync.createInstance({ foo: 'barrr' });
        throw new Error('should not execute');
      } catch (err) {
        assert(err.message === 'egg:singleton dataServiceAsync only support create asynchronous, please use createInstanceAsync');
      }

      const ds4 = await app.dataServiceAsync.createInstanceAsync({ foo: 'barrr' });
      config = await ds4.getConfig();
      assert(config.foo === 'barrr');
    });
  });
});
