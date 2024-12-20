import { strict as assert } from 'node:assert';
import { restore, createApp, MockApplication } from '../../utils.js';

describe('test/app/extend/agent.test.ts', () => {
  afterEach(restore);

  describe('agent.addSingleton()', () => {
    let app: MockApplication;
    before(() => {
      app = createApp('apps/singleton-demo');
      return app.ready();
    });
    after(() => app.close());

    it('should add singleton success', async () => {
      let config = await app.agent.dataService.get('second').getConfig();
      assert(config.foo === 'bar');
      assert(config.foo2 === 'bar2');

      const ds = app.agent.dataService.createInstance({ foo: 'bar2' });
      config = await ds.getConfig();
      assert(config.foo === 'bar2');

      const ds2 = await app.agent.dataService.createInstanceAsync({ foo: 'bar2' });
      config = await ds2.getConfig();
      assert(config.foo === 'bar2');

      config = await app.agent.dataServiceAsync.get('second').getConfig();
      assert(config.foo === 'bar');
      assert(config.foo2 === 'bar2');

      try {
        app.agent.dataServiceAsync.createInstance({ foo: 'bar2' });
        throw new Error('should not execute');
      } catch (err: any) {
        assert(err.message === 'egg:singleton dataServiceAsync only support create asynchronous, please use createInstanceAsync');
      }

      const ds4 = await app.agent.dataServiceAsync.createInstanceAsync({ foo: 'bar2' });
      config = await ds4.getConfig();
      assert(config.foo === 'bar2');
    });
  });
});
