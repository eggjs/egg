import path from 'node:path';
import assert from 'node:assert/strict';

import { request } from '@eggjs/supertest';

import { createApp, getFilepath, type Application } from '../../helper.js';

describe('test/loader/mixin/load_middleware.test.ts', () => {
  let app: Application;
  before(async () => {
    app = createApp('middleware-override');
    await app.loader.loadPlugin();
    await app.loader.loadConfig();
    await app.loader.loadCustomApp();
    await app.loader.loadMiddleware();
    await app.loader.loadController();
    await app.loader.loadRouter();
  });
  after(() => app.close());

  it('should load application, plugin, and default middlewares', () => {
    assert('static' in app.middlewares);
    assert('status' in app.middlewares);
    assert('custom' in app.middlewares);
    assert('b' in app.middlewares);
    assert(!('a' in app.middlewares));
  });

  it('should also support app.middleware', () => {
    assert('static' in app.middleware);
    assert('status' in app.middleware);
    assert('custom' in app.middleware);
    assert('b' in app.middleware);
    assert(!('a' in app.middleware));

    assert.equal(app.middleware.static, app.middlewares.static);
    const names = [];
    for (const mw of app.middleware) {
      assert.equal(typeof mw, 'function');
      names.push(mw._name);
    }
    try {
      assert.deepEqual(names, [
        'status',
        'static',
        'custom',
        'routerMiddleware',
      ]);
    } catch {
      assert.deepEqual(names, [
        'statusDebugWrapper',
        'staticDebugWrapper',
        'customDebugWrapper',
        'routerMiddleware',
      ]);
    }
  });

  it('should override middlewares of plugin by framework', async () => {
    await request(app.callback()).get('/status').expect('egg status');
  });

  it('should override middlewares of plugin by application', async () => {
    await request(app.callback()).get('/custom').expect('app custom');
  });

  it('should override middlewares of egg by application', async () => {
    await request(app.callback()).get('/static').expect(200).expect('static');
  });

  it('should throw when middleware return no-generator', async () => {
    const app = createApp('custom_session_invaild');
    await assert.rejects(async () => {
      await app.loader.loadPlugin();
      await app.loader.loadConfig();
      await app.loader.loadCustomApp();
      await app.loader.loadMiddleware();
    }, /Middleware session must be a function, but actual is {}/);
  });

  it('should throw when not load that is not configured', async () => {
    const app = createApp('no-middleware');
    await assert.rejects(async () => {
      await app.loader.loadPlugin();
      await app.loader.loadConfig();
      await app.loader.loadCustomApp();
      await app.loader.loadMiddleware();
    }, /Middleware a not found/);
  });

  it('should throw when middleware name redefined', async () => {
    const app = createApp('middleware-redefined');
    await assert.rejects(async () => {
      await app.loader.loadPlugin();
      await app.loader.loadConfig();
      await app.loader.loadCustomApp();
      await app.loader.loadMiddleware();
    }, /Middleware status redefined/);
  });

  it('should core middleware support options.enable', async () => {
    const app = createApp('middleware-disable');
    await app.loader.loadPlugin();
    await app.loader.loadConfig();
    await app.loader.loadCustomApp();
    await app.loader.loadMiddleware();
    await app.loader.loadController();
    await app.loader.loadRouter();

    await request(app.callback()).get('/status').expect(404);
    app.close();
  });

  it('should core middleware support options.match', async () => {
    const app = createApp('middleware-match');
    await app.loader.loadPlugin();
    await app.loader.loadConfig();
    await app.loader.loadCustomApp();
    await app.loader.loadMiddleware();
    await app.loader.loadController();
    await app.loader.loadRouter();

    await request(app.callback()).get('/status').expect('egg status');

    await request(app.callback()).post('/status').expect(404);
    app.close();
  });

  it('should core middleware support options.ignore', async () => {
    const app = createApp('middleware-ignore');
    await app.loader.loadPlugin();
    await app.loader.loadConfig();
    await app.loader.loadCustomApp();
    await app.loader.loadMiddleware();
    await app.loader.loadController();
    await app.loader.loadRouter();

    await request(app.callback()).post('/status').expect('egg status');

    await request(app.callback()).get('/status').expect(404);
    app.close();
  });

  it('should app middleware support options.enable', async () => {
    const app = createApp('middleware-app-disable');
    await app.loader.loadPlugin();
    await app.loader.loadConfig();
    await app.loader.loadCustomApp();
    await app.loader.loadMiddleware();
    await app.loader.loadController();
    await app.loader.loadRouter();

    await request(app.callback()).get('/static').expect(404);
    app.close();
  });

  describe('async functions and common functions', () => {
    let app: Application;
    before(async () => {
      app = createApp('middleware-aa');
      await app.loader.loadPlugin();
      await app.loader.loadConfig();
      await app.loader.loadCustomApp();
      await app.loader.loadMiddleware();
      await app.loader.loadController();
      await app.loader.loadRouter();
    });

    after(() => app.close());

    it('should support config.middleware', async () => {
      await request(app.callback())
        .get('/static')
        .expect('static', 'static')
        .expect('hello');
    });

    it('should support app.use', async () => {
      await request(app.callback())
        .get('/')
        .expect('custom', 'custom')
        .expect('hello');
    });

    it('should support with router', async () => {
      await request(app.callback())
        .get('/router')
        .expect('router', 'router')
        .expect('hello');
    });

    it('should support with options.match', async () => {
      await request(app.callback())
        .get('/match')
        .expect(200)
        .expect('match', 'match')
        .expect('hello');
    });

    it('should support common functions', async () => {
      await request(app.callback()).get('/common').expect('common');
    });
  });

  describe('middleware in other directory', () => {
    let app: Application;
    before(async () => {
      const baseDir = getFilepath('other-directory');
      app = createApp('other-directory');
      await app.loader.loadPlugin();
      await app.loader.loadConfig();
      await app.loader.loadCustomApp();
      const directory = app.loader
        .getLoadUnits()
        .map(unit => path.join(unit.path, 'app/middleware'));
      directory.push(path.join(baseDir, 'app/other-middleware'));
      await app.loader.loadMiddleware({
        directory,
      });
      return app.ready();
    });
    after(() => app.close());

    it('should load', () => {
      assert(app.middlewares.user);
    });
  });
});
