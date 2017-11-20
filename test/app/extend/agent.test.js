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
    });
  });
});
