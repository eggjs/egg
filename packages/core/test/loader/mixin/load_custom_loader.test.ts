import assert from 'node:assert/strict';

import { request } from '@eggjs/supertest';

import { createApp, type Application } from '../../helper.js';

describe('test/loader/mixin/load_custom_loader.test.ts', () => {
  let app: Application;
  before(async () => {
    app = createApp('custom-loader');
    await app.loader.loadPlugin();
    await app.loader.loadConfig();
    await app.loader.loadController();
    await app.loader.loadRouter();
    await app.loader.loadMiddleware();
    await app.loader.loadCustomLoader();
  });
  after(() => app.close());

  it('should load to app', async () => {
    console.log((app as any).adapter);
    const res = await (app as any).adapter.docker.inspectDocker();
    assert(res);
    assert(res.inject === 'app');
  });

  it('should support exports load to app', () => {
    assert((app as any).util.test.sayHi('egg') === 'hi, egg');
    assert((app as any).util.sub.fn.echo() === 'echo custom_loader');
  });

  it('should load to ctx', async () => {
    await request(app.callback())
      .get('/users/popomore')
      .expect({
        adapter: {
          directory: 'app/adapter',
          inject: 'app',
        },
        repository: 'popomore',
      })
      .expect(200);
  });

  it('should support loadunit', () => {
    let name = (app as any).plugin.a.getName();
    assert(name === 'plugina');
    name = (app as any).plugin.b.getName();
    assert(name === 'pluginb');
  });

  it('should loadConfig first', async () => {
    const app = createApp('custom-loader');
    try {
      await app.loader.loadCustomLoader();
      throw new Error('should not run');
    } catch (err: any) {
      assert(err.message === 'should loadConfig first');
    } finally {
      app.close();
    }
  });

  it('support set directory', async () => {
    const app = createApp('custom-loader');
    try {
      app.loader.config = {
        customLoader: {
          custom: {},
        },
      } as any;
      await app.loader.loadCustomLoader();
      throw new Error('should not run');
    } catch (err: any) {
      assert(
        err.message === 'directory is required for config.customLoader.custom'
      );
    } finally {
      app.close();
    }
  });

  it('inject support app/ctx', async () => {
    const app = createApp('custom-loader');
    try {
      app.loader.config = {
        customLoader: {
          custom: {
            directory: 'a',
            inject: 'unknown',
          },
        },
      } as any;
      await app.loader.loadCustomLoader();
      throw new Error('should not run');
    } catch (err: any) {
      assert(err.message === 'inject only support app or ctx');
    } finally {
      app.close();
    }
  });

  it('should not overwrite the existing property', async () => {
    const app = createApp('custom-loader');
    try {
      app.loader.config = {
        coreMiddleware: [],
        middleware: [],
        customLoader: {
          config: {
            directory: 'app/config',
            inject: 'app',
          },
        },
      };
      await app.loader.loadCustomLoader();
      throw new Error('should not run');
    } catch (err: any) {
      assert(err.message === 'customLoader should not override app.config');
    } finally {
      app.close();
    }

    try {
      app.loader.config = {
        customLoader: {
          cookies: {
            directory: 'app/cookies',
            inject: 'ctx',
          },
        },
      } as any;
      await app.loader.loadCustomLoader();
      throw new Error('should not run');
    } catch (err: any) {
      assert(err.message === 'customLoader should not override ctx.cookies');
    } finally {
      app.close();
    }
  });
});
