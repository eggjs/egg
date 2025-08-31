import path from 'node:path';
import assert from 'node:assert/strict';

import { mm } from 'mm';

import { EggCore } from '../../../src/index.js';
import { createApp, getFilepath, type Application } from '../../helper.js';

describe('test/loader/mixin/load_config.test.ts', () => {
  let app: Application;
  afterEach(() => app.close());
  afterEach(mm.restore);

  it('should load application config overriding default of egg', async () => {
    app = createApp('config');
    const loader = app.loader;
    await loader.loadPlugin();
    await loader.loadConfig();
    assert(loader.config.name === 'config-test');
    assert(loader.config.test === 1);
    // 支持嵌套覆盖
    assert.deepEqual(loader.config.urllib, {
      keepAlive: false,
      keepAliveTimeout: 30_000,
      timeout: 30_000,
      maxSockets: Number.POSITIVE_INFINITY,
      maxFreeSockets: 256,
    });
  });

  it('should load plugin config overriding default of egg', async () => {
    app = createApp('plugin');
    const loader = app.loader;
    await loader.loadPlugin();
    await loader.loadConfig();
    assert(loader.config.name === 'override default');
  });

  it('should load application config overriding plugin', async () => {
    app = createApp('plugin');
    const loader = app.loader;
    await loader.loadPlugin();
    await loader.loadConfig();
    assert(loader.config.plugin === 'override plugin');
  });

  // egg config.default
  //   framework config.default
  //     egg config.local
  //       framework config.local
  it('should load config by env', async () => {
    app = createApp('config-env');
    const loader = app.loader;
    await loader.loadPlugin();
    await loader.loadConfig();
    assert(loader.config.egg === 'egg-unittest');
  });

  it('should override config by env.EGG_APP_CONFIG', async () => {
    mm(
      process.env,
      'EGG_APP_CONFIG',
      JSON.stringify({
        egg: 'env_egg',
        foo: {
          bar: 'env_bar',
        },
      })
    );
    app = createApp('config-env-app-config');
    const loader = app.loader;
    await loader.loadPlugin();
    await loader.loadConfig();
    assert(loader.config.egg === 'env_egg');
    assert(loader.config.foo.bar === 'env_bar');
    assert(loader.config.foo.bar2 === 'b');
    assert(loader.configMeta.egg === '<process.env.EGG_APP_CONFIG>');
    assert(loader.configMeta.foo.bar === '<process.env.EGG_APP_CONFIG>');
  });

  it('should override config with invalid env.EGG_APP_CONFIG', async () => {
    mm(process.env, 'EGG_APP_CONFIG', 'abc');
    app = createApp('config-env-app-config');
    const loader = app.loader;
    await loader.loadPlugin();
    await loader.loadConfig();
    assert(loader.config.egg === 'egg-unittest');
    assert(loader.config.foo.bar === 'a');
    assert(loader.config.foo.bar2 === 'b');
  });

  it('should not load config of plugin that is disabled', async () => {
    app = createApp('plugin');
    const loader = app.loader;
    await loader.loadPlugin();
    await loader.loadConfig();
    assert(!loader.config.pluginA);
  });

  it('should throw when plugin define middleware', async () => {
    const pluginDir = getFilepath('plugin/plugin-middleware');
    app = createApp('plugin', {
      plugins: {
        middleware: {
          enable: true,
          path: pluginDir,
        },
      },
    });
    const loader = app.loader;
    try {
      await loader.loadPlugin();
      await loader.loadConfig();
      throw new Error('should not run');
    } catch (err: any) {
      assert(
        err.message.includes(
          `Can not define middleware in ${path.join(pluginDir, 'config/config.default.js')}`
        )
      );
    }
  });

  it('should throw when app define coreMiddleware', async () => {
    app = createApp('app-core-middleware');
    await assert.rejects(async () => {
      await app.loader.loadPlugin();
      await app.loader.loadConfig();
    }, new RegExp('Can not define coreMiddleware in app or plugin'));
  });

  it('should read appinfo from the function of config', async () => {
    app = createApp('preload-app-config');
    const loader = app.loader;
    await loader.loadPlugin();
    await loader.loadConfig();
    assert(loader.config.plugin.val === 2);
    assert(loader.config.plugin.val === 2);
    assert(loader.config.plugin.sub !== loader.config.app.sub);
    assert(loader.config.appInApp === false);
  });

  it('should load config without coreMiddleware', async () => {
    app = new EggCore({
      baseDir: getFilepath('no-core-middleware'),
    }) as any;
    await app.loader.loadPlugin();
    await app.loader.loadConfig();
    assert.equal(app.config.coreMiddleware.length, 0);
  });

  it('should override array', async () => {
    app = createApp('config-array');
    await app.loader.loadPlugin();
    await app.loader.loadConfig();
    assert.deepEqual(app.config.array, [1, 2]);
  });

  it('should generate configMeta', async () => {
    app = createApp('configmeta');
    await app.loader.loadPlugin();
    await app.loader.loadConfig();
    const configMeta = app.loader.configMeta;
    const configPath = getFilepath('configmeta/config/config.js');
    if (process.platform === 'win32') {
      assert.equal(configMeta.console.toLowerCase(), configPath);
      assert.equal(configMeta.array.toLowerCase(), configPath);
      assert.equal(configMeta.buffer.toLowerCase(), configPath);
      assert.equal(configMeta.ok.toLowerCase(), configPath);
      assert.equal(configMeta.f.toLowerCase(), configPath);
      assert.equal(configMeta.empty.toLowerCase(), configPath);
      assert.equal(configMeta.zero.toLowerCase(), configPath);
      assert.equal(configMeta.number.toLowerCase(), configPath);
      assert.equal(configMeta.no.toLowerCase(), configPath);
      assert.equal(configMeta.date.toLowerCase(), configPath);
      assert.equal(configMeta.ooooo.toLowerCase(), configPath);
      assert.equal(configMeta.urllib.keepAlive.toLowerCase(), configPath);
      assert.equal(
        configMeta.urllib.timeout.toLowerCase(),
        getFilepath('egg-esm/config/config.default.js')
      );
      assert.equal(configMeta.urllib.foo.toLowerCase(), configPath);
      assert.equal(configMeta.urllib.n.toLowerCase(), configPath);
      assert.equal(configMeta.urllib.dd.toLowerCase(), configPath);
      assert.equal(configMeta.urllib.httpclient.toLowerCase(), configPath);
    } else {
      assert.equal(configMeta.console, configPath);
      assert.equal(configMeta.array, configPath);
      assert.equal(configMeta.buffer, configPath);
      assert.equal(configMeta.ok, configPath);
      assert.equal(configMeta.f, configPath);
      assert.equal(configMeta.empty, configPath);
      assert.equal(configMeta.zero, configPath);
      assert.equal(configMeta.number, configPath);
      assert.equal(configMeta.no, configPath);
      assert.equal(configMeta.date, configPath);
      assert.equal(configMeta.ooooo, configPath);
      assert.equal(configMeta.urllib.keepAlive, configPath);
      assert.equal(
        configMeta.urllib.timeout,
        getFilepath('egg-esm/config/config.default.js')
      );
      assert.equal(configMeta.urllib.foo, configPath);
      assert.equal(configMeta.urllib.n, configPath);
      assert.equal(configMeta.urllib.dd, configPath);
      assert.equal(configMeta.urllib.httpclient, configPath);
    }
    // undefined will be ignore
    assert.equal(configMeta.urllib.bar, undefined);
  });

  describe('get config with scope', () => {
    it('should return without scope when env = default', async () => {
      mm(process.env, 'EGG_SERVER_ENV', 'default');
      app = createApp('scope-env');
      const loader = app.loader;
      await loader.loadPlugin();
      await app.loader.loadConfig();
      assert(loader.config.from === 'default');
    });

    it('should return without scope when env = prod', async () => {
      mm(process.env, 'EGG_SERVER_ENV', 'prod');
      app = createApp('scope-env');
      const loader = app.loader;
      await loader.loadPlugin();
      await app.loader.loadConfig();
      assert(loader.config.from === 'prod');
    });

    it('should return with scope when env = default', async () => {
      mm(process.env, 'EGG_SERVER_ENV', 'default');
      mm(process.env, 'EGG_SERVER_SCOPE', 'en');
      app = createApp('scope-env');
      const loader = app.loader;
      await loader.loadPlugin();
      await app.loader.loadConfig();
      assert(loader.config.from === 'en');
    });

    it('should return with scope when env = prod', async () => {
      mm(process.env, 'EGG_SERVER_ENV', 'prod');
      mm(process.env, 'EGG_SERVER_SCOPE', 'en');
      app = createApp('scope-env');
      const loader = app.loader;
      await loader.loadPlugin();
      await app.loader.loadConfig();
      assert(loader.config.from === 'en_prod');
    });
  });
});
