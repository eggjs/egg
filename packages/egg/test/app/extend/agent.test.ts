import { strict as assert } from 'node:assert';

import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';

import { restore, createApp, type MockApplication } from '../../utils.ts';

describe('test/app/extend/agent.test.ts', () => {
  afterEach(restore);

  describe('agent.addSingleton()', () => {
    let app: MockApplication;
    beforeAll(() => {
      app = createApp('apps/singleton-demo');
      return app.ready();
    });
    afterAll(() => app.close());

    it('should add singleton success', async () => {
      // @ts-expect-error dataService no type definition
      const dataService = app.agent.dataService;
      let config = await dataService.get('second').getConfig();
      assert.equal(config.foo, 'bar');
      assert.equal(config.foo2, 'bar2');

      const ds = dataService.createInstance({ foo: 'bar2' });
      config = await ds.getConfig();
      assert.equal(config.foo, 'bar2');

      const ds2 = await dataService.createInstanceAsync({
        foo: 'bar2',
      });
      config = await ds2.getConfig();
      assert.equal(config.foo, 'bar2');

      // @ts-expect-error dataServiceAsync no type definition
      const dataServiceAsync = app.agent.dataServiceAsync;
      config = await dataServiceAsync.get('second').getConfig();
      assert.equal(config.foo, 'bar');
      assert.equal(config.foo2, 'bar2');

      assert.throws(() => {
        dataServiceAsync.createInstance({ foo: 'bar2' });
      }, /dataServiceAsync only support asynchronous creation, please use createInstanceAsync/);

      const ds4 = await dataServiceAsync.createInstanceAsync({
        foo: 'bar2',
      });
      config = await ds4.getConfig();
      assert.equal(config.foo, 'bar2');
    });
  });
});
