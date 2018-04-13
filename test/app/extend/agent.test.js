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
      let config = await app.agent.dataService.get('second').getConfig();
      assert(config.foo === 'bar');
      assert(config.foo2 === 'bar2');

      const ds = app.agent.dataService.createInstance({ foo: 'barrr' });
      config = await ds.getConfig();
      assert(config.foo === 'barrr');

      const ds2 = await app.agent.dataService.createInstanceAsync({ foo: 'barrr' });
      config = await ds2.getConfig();
      assert(config.foo === 'barrr');

      config = await app.agent.dataServiceAsync.get('second').getConfig();
      assert(config.foo === 'bar');
      assert(config.foo2 === 'bar2');

      try {
        app.agent.dataServiceAsync.createInstance({ foo: 'barrr' });
        throw new Error('should not execute');
      } catch (err) {
        assert(err.message === 'egg:singleton dataServiceAsync only support create asynchronous, please use createInstanceAsync');
      }

      const ds4 = await app.agent.dataServiceAsync.createInstanceAsync({ foo: 'barrr' });
      config = await ds4.getConfig();
      assert(config.foo === 'barrr');
    });
  });
});
