import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

import { mm } from 'mm';

import { createApp, getFilepath, type Application } from '../../helper.js';
import { EggCore, EggLoader } from '../../../src/index.js';

describe('test/loader/mixin/load_plugin.test.ts', () => {
  let app: Application | undefined;

  afterEach(async () => {
    mm.restore();
    if (app) {
      await app.close();
    }
    app = undefined;
  });

  it('should exports allPlugins, appPlugins, customPlugins, eggPlugins', async () => {
    app = createApp('plugin');
    const loader = app.loader;
    await loader.loadPlugin();
    assert('allPlugins' in loader);
    assert('appPlugins' in loader);
    assert('customPlugins' in loader);
    assert('eggPlugins' in loader);
  });

  it('should load plugin by pkg.eggPlugin.exports', async () => {
    app = createApp('plugin-pkg-exports');
    const loader = app.loader;
    await loader.loadPlugin();
    assert('allPlugins' in loader);
    assert('appPlugins' in loader);
    assert('customPlugins' in loader);
    assert('eggPlugins' in loader);
    assert(loader.plugins.a.enable);
  });

  it('should loadConfig all plugins', async () => {
    const baseDir = getFilepath('plugin');
    app = createApp('plugin');
    const loader = app.loader;
    await loader.loadPlugin();
    await loader.loadConfig();
    assert.deepEqual(loader.plugins.b, {
      enable: true,
      name: 'b',
      dependencies: [],
      optionalDependencies: [],
      env: [],
      path: path.join(baseDir, 'node_modules/b'),
      from: path.join(baseDir, 'config/plugin.js'),
    });
    assert.deepEqual(loader.plugins.c, {
      enable: true,
      name: 'c',
      dependencies: [],
      optionalDependencies: [],
      env: [],
      path: path.join(baseDir, 'node_modules/c'),
      from: path.join(baseDir, 'config/plugin.js'),
    });
    assert.deepEqual(loader.plugins.e, {
      enable: true,
      name: 'e',
      dependencies: ['f'],
      optionalDependencies: [],
      env: [],
      path: path.join(baseDir, 'plugins/e'),
      from: path.join(baseDir, 'config/plugin.js'),
    });
    assert(Array.isArray(loader.orderPlugins));
  });

  it('should loadPlugin with order', async () => {
    app = createApp('plugin');
    const loader = app.loader;
    const loaderOrders: string[] = [];
    ['loadEggPlugins', 'loadAppPlugins', 'loadCustomPlugins'].forEach(
      method => {
        mm(loader, method, async () => {
          loaderOrders.push(method);
          return {};
        });
      }
    );

    await loader.loadPlugin();
    assert.deepEqual(loaderOrders, [
      'loadEggPlugins',
      'loadAppPlugins',
      'loadCustomPlugins',
    ]);
  });

  it('should follow the search order，node_modules of application > node_modules of framework', async () => {
    const baseDir = getFilepath('plugin');
    app = createApp('plugin');
    const loader = app.loader;
    await loader.loadPlugin();
    await loader.loadConfig();

    assert.deepEqual(loader.plugins.rds, {
      enable: true,
      name: 'rds',
      dependencies: ['session'],
      optionalDependencies: [],
      env: [],
      package: 'rds',
      path: path.join(baseDir, 'node_modules/rds'),
      from: path.join(baseDir, 'config/plugin.js'),
    });
  });

  it('should support pnpm node_modules style', async () => {
    class Application extends EggCore {
      get [Symbol.for('egg#loader')]() {
        return EggLoader;
      }
      get [Symbol.for('egg#eggPath')]() {
        return getFilepath(
          'plugin-pnpm/node_modules/.pnpm/framework@1.0.0/node_modules/framework'
        );
      }
    }
    app = createApp('plugin-pnpm', {
      Application,
    });
    const loader = app.loader;
    await loader.loadPlugin();
    await loader.loadConfig();
    // console.log(loader.plugins, loader.config);
    assert(loader.plugins.a);
    assert(loader.plugins.b);
    assert(loader.config.a === 'a');
    assert(loader.config.b === 'b');
  });

  it('should support pnpm node_modules style with scope', async () => {
    class Application extends EggCore {
      get [Symbol.for('egg#loader')]() {
        return EggLoader;
      }
      get [Symbol.for('egg#eggPath')]() {
        return getFilepath(
          'plugin-pnpm-scope/node_modules/.pnpm/@eggjs+yadan@1.0.0/node_modules/@eggjs/yadan'
        );
      }
    }
    app = createApp('plugin-pnpm-scope', {
      Application,
    });
    const loader = app.loader;
    await loader.loadPlugin();
    await loader.loadConfig();
    // console.log(loader.plugins, loader.config);
    assert(loader.plugins.a);
    assert(loader.plugins.b);
    assert(loader.config.a === 'a');
    assert(loader.config.b === 'b');
  });

  it('should support alias', async () => {
    const baseDir = getFilepath('plugin');
    app = createApp('plugin');
    const loader = app.loader;
    await loader.loadPlugin();
    await loader.loadConfig();

    assert.deepEqual(loader.plugins.d1, {
      enable: true,
      name: 'd1',
      package: 'd',
      dependencies: [],
      optionalDependencies: [],
      env: [],
      path: path.join(baseDir, 'node_modules/d'),
      from: path.join(baseDir, 'config/plugin.js'),
    });
    assert(!loader.plugins.d);
  });

  it('should support config in package.json', async () => {
    const baseDir = getFilepath('plugin');
    app = createApp('plugin');
    const loader = app.loader;
    await loader.loadPlugin();
    await loader.loadConfig();

    assert.deepEqual(loader.plugins.g, {
      enable: true,
      name: 'g',
      dependencies: ['f'],
      optionalDependencies: [],
      env: [],
      path: path.join(baseDir, 'plugins/g'),
      version: '1.0.0',
      from: path.join(baseDir, 'config/plugin.js'),
    });
  });

  it('should warn when the name of plugin is not same', async () => {
    let message = '';
    app = createApp('plugin');
    mm(app.console, 'warn', (m: string) => {
      if (
        !m.startsWith('[@eggjs/core/egg_loader] eggPlugin is missing') &&
        !message
      ) {
        message = m;
      }
    });
    const loader = app.loader;
    await loader.loadPlugin();
    await loader.loadConfig();

    assert.equal(
      message,
      '[@eggjs/core/egg_loader] pluginName(e) is different from pluginConfigName(wrong-name)'
    );
  });

  it('should not warn when the config.strict is false', async () => {
    let message = '';
    app = createApp('plugin-strict');
    mm(app.console, 'warn', (m: string) => {
      message = m;
    });
    const loader = app.loader;
    await loader.loadPlugin();
    assert(!message);
  });

  it('should load plugin when eggPlugin.exports.typescript = "./src" exists', async () => {
    app = createApp('plugin-ts-src');
    const loader = app.loader;
    await loader.loadPlugin();
    assert(loader.allPlugins.agg.path);
    assert.match(loader.allPlugins.agg.path, /src$/);
  });

  it('should loadConfig plugins with custom plugins config', async () => {
    const baseDir = getFilepath('plugin');
    const plugins = {
      foo: {
        enable: true,
        path: path.join(baseDir, 'node_modules/d'),
      },
      d1: {
        env: ['unittest'],
      },
    };
    app = createApp('plugin', { plugins });
    const loader = app.loader;
    await loader.loadPlugin();
    await loader.loadConfig();

    assert.deepEqual(loader.plugins.d1, {
      enable: true,
      name: 'd1',
      package: 'd',
      dependencies: [],
      optionalDependencies: [],
      env: ['unittest'],
      path: path.join(baseDir, 'node_modules/d'),
      from: '<options.plugins>',
    });
    assert.deepEqual(loader.plugins.foo, {
      enable: true,
      name: 'foo',
      dependencies: [],
      optionalDependencies: [],
      env: [],
      path: path.join(baseDir, 'node_modules/d'),
      from: '<options.plugins>',
    });
    assert(!loader.plugins.d);
  });

  it('should custom plugins with EGG_PLUGINS', async () => {
    const baseDir = getFilepath('plugin');
    const plugins = {
      b: false,
      h: {
        enable: true,
        path: path.join(baseDir, 'node_modules/h'),
      },
    };
    mm(process.env, 'EGG_PLUGINS', `${JSON.stringify(plugins)}`);
    app = createApp('plugin');
    const loader = app.loader;
    await loader.loadPlugin();
    await loader.loadConfig();

    assert(loader.allPlugins.b.enable === false);
    assert(loader.allPlugins.h.enable === true);
    assert(loader.allPlugins.h.path === path.join(baseDir, 'node_modules/h'));
  });

  it('should ignore when EGG_PLUGINS parse error', async () => {
    mm(process.env, 'EGG_PLUGINS', '{h:1}');
    app = createApp('plugin');
    const loader = app.loader;
    await loader.loadPlugin();
    await loader.loadConfig();
    assert(!loader.allPlugins.h);
  });

  it('should validate plugin.package', async () => {
    await assert.rejects(async () => {
      app = createApp('plugin', {
        plugins: { foo: { package: '../' }, bar: { package: 'c:\\' } },
      });
      const loader = app.loader;
      await loader.loadPlugin();
      await loader.loadConfig();
    }, /plugin foo invalid, use 'path' instead of package/);

    await assert.rejects(async () => {
      app = createApp('plugin', { plugins: { foo: { package: 'c:\\' } } });
      const loader = app.loader;
      await loader.loadPlugin();
      await loader.loadConfig();
    }, /plugin foo invalid, use 'path' instead of package/);

    await assert.rejects(async () => {
      app = createApp('plugin', { plugins: { foo: { package: '/home' } } });
      const loader = app.loader;
      await loader.loadPlugin();
      await loader.loadConfig();
    }, /plugin foo invalid, use 'path' instead of package/);
  });

  it('should throw when plugin not exist', async () => {
    await assert.rejects(async () => {
      app = createApp('plugin-noexist');
      const loader = app.loader;
      await loader.loadPlugin();
      await loader.loadConfig();
    }, /Can not find plugin noexist in /);
  });

  it('should throw when the dependent plugin is disabled', async () => {
    await assert.rejects(async () => {
      app = createApp('no-dep-plugin');
      const loader = app.loader;
      await loader.loadPlugin();
      await loader.loadConfig();
    }, /Can not find plugin @ali\/b in /);
  });

  it('should make order', async () => {
    mm(process.env, 'NODE_ENV', 'development');
    app = createApp('plugin-dep');
    const loader = app.loader;
    await loader.loadPlugin();
    await loader.loadConfig();
    assert.deepEqual(
      loader.orderPlugins.map(plugin => plugin.name),
      ['session', 'zzz', 'package', 'b', 'c1', 'f', 'a', 'd', 'e']
    );
  });

  it('should throw when plugin is recursive', async () => {
    await assert.rejects(async () => {
      app = createApp('plugin-dep-recursive');
      const loader = app.loader;
      await loader.loadPlugin();
      await loader.loadConfig();
    }, /sequencify plugins has problem, missing: \[], recursive: \[a,b,c,a]/);
  });

  it('should throw when the dependent plugin not exist', async () => {
    await assert.rejects(async () => {
      app = createApp('plugin-dep-missing');
      const loader = app.loader;
      await loader.loadPlugin();
      await loader.loadConfig();
    }, /sequencify plugins has problem, missing: \[a1], recursive: \[]\n\t>> Plugin \[a1] is disabled or missed, but is required by \[c]/);
  });

  it('should log when enable plugin implicitly', async () => {
    app = createApp('plugin-framework');
    mm(app.console, 'info', (msg: string) => {
      if (msg.startsWith('[egg:loader] eggPlugin is missing')) {
        return;
      }
      // Following plugins will be enabled implicitly.
      //   - eagleeye required by [hsfclient]
      //   - configclient required by [hsfclient]
      //   - diamond required by [hsfclient]
      assert.equal(
        msg,
        'Following plugins will be enabled implicitly.\n  - eagleeye required by [hsfclient]\n  - configclient required by [hsfclient]\n  - diamond required by [hsfclient]'
      );
    });
    const loader = app.loader;
    await loader.loadPlugin();
    await loader.loadConfig();
    // assert.deepEqual(loader.plugins 应该是都被开启的插件
    for (const name in loader.plugins) {
      assert.equal(loader.plugins[name].enable, true);
    }
  });

  it('should enable dependencies implicitly but not optionalDependencies', async () => {
    class Application extends EggCore {
      get [Symbol.for('egg#eggPath')]() {
        return getFilepath('plugin-dep-disable/framework');
      }
    }

    app = createApp('plugin-dep-disable', {
      Application,
    });
    const loader = app.loader;
    await loader.loadPlugin();
    await loader.loadConfig();
    assert.equal(loader.plugins.a.enable, true);
    assert.equal(loader.plugins.b.enable, true);
    assert.equal(loader.plugins.d.enable, true);
    assert.equal(loader.plugins.c.enable, true);
    assert.equal(loader.plugins.e.enable, true);
    assert.deepEqual(Object.keys(loader.plugins), ['b', 'e', 'c', 'a', 'd']);
  });

  it('should enable when not match env', async () => {
    app = createApp('dont-load-plugin');
    const loader = app.loader;
    await loader.loadPlugin();
    await loader.loadConfig();
    assert(!loader.plugins.testMe);
    const plugins = loader.orderPlugins.map(plugin => plugin.name);
    assert(!plugins.includes('testMe'));
  });

  it('should complement infomation by config/plugin.js from plugin', async () => {
    const baseDir = getFilepath('plugin');

    mm(process.env, 'NODE_ENV', 'test');
    const app1 = createApp('plugin');
    const loader1 = app1.loader;
    await loader1.loadPlugin();
    await loader1.loadConfig();

    // unittest 环境不开启
    const keys1 = loader1.orderPlugins.map(plugin => plugin.name).join(',');
    assert(keys1.includes('b,c,d1,f,e'));
    assert(!loader1.plugins.a1);

    mm(process.env, 'NODE_ENV', 'development');
    const app2 = createApp('plugin');
    const loader2 = app2.loader;
    await loader2.loadPlugin();
    await loader2.loadConfig();
    const keys2 = loader2.orderPlugins.map(plugin => plugin.name).join(',');
    assert(keys2.includes('d1,a1,b,c,f,e'));
    assert.deepEqual(loader2.plugins.a1, {
      enable: true,
      name: 'a1',
      dependencies: ['d1'],
      optionalDependencies: [],
      env: ['local', 'prod'],
      path: path.join(baseDir, 'node_modules/a1'),
      from: path.join(baseDir, 'config/plugin.js'),
    });
  });

  it('should load when all plugins are disabled', async () => {
    app = createApp('noplugin');
    const loader = app.loader;
    await loader.loadPlugin();
    await loader.loadConfig();
    assert.equal(loader.orderPlugins.length, 0);
  });

  it('should throw when the dependent plugin is disabled', async () => {
    await assert.rejects(async () => {
      mm(process.env, 'EGG_SERVER_ENV', 'prod');
      app = createApp('env-disable');
      const loader = app.loader;
      await loader.loadPlugin();
      await loader.loadConfig();
    }, /sequencify plugins has problem, missing: \[b], recursive: \[]\n\t>> Plugin \[b] is disabled or missed, but is required by \[a]/);
  });

  it('should pick path or package when override config', async () => {
    app = createApp('plugin-path-package');
    const loader = app.loader;
    await loader.loadPlugin();
    await loader.loadConfig();
    assert(!loader.plugins.session.package);
    assert.equal(
      loader.plugins.session.path,
      getFilepath('plugin-path-package/session')
    );
    assert(loader.plugins.hsfclient.package);
    assert.equal(
      loader.plugins.hsfclient.path,
      getFilepath('plugin-path-package/node_modules/hsfclient')
    );
  });

  it('should resolve the realpath of plugin path', async () => {
    fs.rmSync(getFilepath('realpath/node_modules/a'), {
      force: true,
      recursive: true,
    });
    fs.symlinkSync('../a', getFilepath('realpath/node_modules/a'), 'dir');
    app = createApp('realpath');
    const loader = app.loader;
    await loader.loadPlugin();
    const plugin = loader.plugins.a;
    assert.equal(plugin.name, 'a');
    assert.equal(plugin.path, getFilepath('realpath/node_modules/a'));
  });

  it('should get the defining plugin path in every plugin', async () => {
    class Application extends EggCore {
      get [Symbol.for('egg#loader')]() {
        return EggLoader;
      }
      get [Symbol.for('egg#eggPath')]() {
        return getFilepath('plugin-from/framework');
      }
    }
    app = createApp('plugin-from', {
      Application,
    });
    const loader = app.loader;
    await loader.loadPlugin();
    assert.equal(
      loader.plugins.a.from,
      getFilepath('plugin-from/config/plugin.js')
    );
    assert.equal(
      loader.plugins.b.from,
      getFilepath('plugin-from/framework/config/plugin.js')
    );
  });

  it('should load plugin.unittest.js override default', async () => {
    mm(process.env, 'EGG_SERVER_ENV', 'unittest');
    app = createApp('load-plugin-by-env');
    const loader = app.loader;
    await loader.loadPlugin();
    assert.equal(loader.allPlugins.a.enable, false);
    assert.equal(loader.allPlugins.b.enable, true);
  });

  it('should load plugin.custom.js when env is custom', async () => {
    mm(process.env, 'EGG_SERVER_ENV', 'custom');
    app = createApp('load-plugin-by-env');
    const loader = app.loader;
    await loader.loadPlugin();
    assert.equal(loader.allPlugins.a.enable, true);
    assert(!loader.allPlugins.b);
    assert.equal(loader.allPlugins.c.enable, true);
  });

  it('should not load plugin.js when plugin.default.js exist', async () => {
    mm(process.env, 'EGG_SERVER_ENV', 'unittest');
    app = createApp('load-plugin-default');
    const loader = app.loader;
    await loader.loadPlugin();
    assert(!loader.allPlugins.a);
    assert.equal(loader.allPlugins.b.enable, true);
    assert.equal(loader.allPlugins.c.enable, true);
  });

  it('should warn when redefine plugin', async () => {
    app = createApp('load-plugin-config-override');
    mm(
      app.console,
      'warn',
      (msg: string, name: string, targetPlugin: object, from: string) => {
        assert.equal(
          msg,
          'plugin %s has been defined that is %j, but you define again in %s'
        );
        assert.equal(name, 'zzz');
        assert.deepEqual(targetPlugin, {
          enable: true,
          path: getFilepath('egg/plugins/zzz'),
          name: 'zzz',
          dependencies: [],
          optionalDependencies: [],
          env: [],
          from: getFilepath('egg/config/plugin.js'),
        });
        assert.equal(
          from,
          getFilepath('load-plugin-config-override/config/plugin.js')
        );
      }
    );
    const loader = app.loader;
    await loader.loadPlugin();
    assert.equal(
      loader.allPlugins.zzz.path,
      getFilepath('load-plugin-config-override/plugins/zzz')
    );
  });

  it('should support optionalDependencies', async () => {
    app = createApp('plugin-optional-dependencies');
    const loader = app.loader;
    await loader.loadPlugin();
    assert.deepEqual(
      loader.orderPlugins.map(p => p.name),
      ['session', 'zzz', 'package', 'e', 'b', 'a', 'f']
    );
  });

  it('should warn when redefine plugin', async () => {
    app = createApp('redefine-plugin');
    await app.loader.loadPlugin();
  });

  it('should not warn when not redefine plugin', async () => {
    mm(process.env, 'EGG_SERVER_ENV', 'default');
    app = createApp('no-redefine-plugin');
    // const warn = spy();
    // mm(app.console, 'warn', warn);
    await app.loader.loadPlugin();
    // assert(warn.callCount === 0);
  });

  it('should parse complex dependencies', async () => {
    class Application extends EggCore {
      get [Symbol.for('egg#eggPath')]() {
        return getFilepath('plugin-complex-dependencies');
      }
    }
    app = createApp('plugin-complex-dependencies', {
      // use clean framework
      Application,
    });
    const loader = app.loader;
    await loader.loadPlugin();
    assert.deepEqual(
      loader.orderPlugins.map(p => p.name),
      ['zookeeper', 'ddcs', 'vip', 'zoneclient', 'rpc', 'ldc']
    );
  });

  it('should parse implicitly enable dependencies', async () => {
    class Application extends EggCore {
      get [Symbol.for('egg#eggPath')]() {
        return getFilepath('plugin-implicit-enable-dependencies');
      }
    }
    app = createApp('plugin-implicit-enable-dependencies', {
      // use clean framework
      Application,
    });
    const loader = app.loader;
    await loader.loadPlugin();
    assert.deepEqual(
      loader.orderPlugins.map(p => p.name),
      ['zoneclient', 'ldc', 'rpcServer', 'tracelog', 'gateway']
    );

    assert.equal(loader.allPlugins.zoneclient.enable, true);
    assert.equal(loader.allPlugins.zoneclient.implicitEnable, true);
    assert.deepEqual(loader.allPlugins.zoneclient.dependents, ['ldc']);
  });

  it('should load plugin from scope', async () => {
    mm(process.env, 'EGG_SERVER_SCOPE', 'en');
    app = createApp('scope');
    const loader = app.loader;
    await loader.loadPlugin();
    assert.equal(loader.allPlugins.a.enable, false);
  });

  it('should load plugin from scope and default env', async () => {
    mm(process.env, 'EGG_SERVER_ENV', 'default');
    mm(process.env, 'EGG_SERVER_SCOPE', 'en');
    app = createApp('scope-env');
    const loader = app.loader;
    await loader.loadPlugin();
    assert.equal(loader.allPlugins.a.enable, false);
    assert.equal(loader.allPlugins.b.enable, true);
    assert(!loader.allPlugins.c);
    assert(!loader.allPlugins.d);
  });

  it('should load plugin from scope and prod env', async () => {
    mm(process.env, 'EGG_SERVER_ENV', 'prod');
    mm(process.env, 'EGG_SERVER_SCOPE', 'en');
    app = createApp('scope-env');
    const loader = app.loader;
    await loader.loadPlugin();
    assert.equal(loader.allPlugins.a.enable, false);
    assert.equal(loader.allPlugins.b.enable, false);
    assert.equal(loader.allPlugins.c.enable, false);
    assert.equal(loader.allPlugins.d.enable, true);
  });

  it('should not load optionalDependencies and their dependencies', async () => {
    mm(process.env, 'EGG_SERVER_ENV', 'default');
    app = createApp('plugin-complex-deps');
    const loader = app.loader;
    await loader.loadPlugin();
    assert.equal(loader.allPlugins.tracelog.enable, true);
    assert.equal(loader.allPlugins.gw.enable, false);
    assert.equal(loader.allPlugins.rpcServer.enable, false);
  });

  it('should load plugin with duplicate plugin dir from eggPaths', async () => {
    class BaseApplication extends EggCore {
      get [Symbol.for('egg#loader')]() {
        return EggLoader;
      }
      get [Symbol.for('egg#eggPath')]() {
        return getFilepath(path.join('plugin-duplicate'));
      }
    }

    class Application extends BaseApplication {
      get [Symbol.for('egg#loader')]() {
        return EggLoader;
      }
      get [Symbol.for('egg#eggPath')]() {
        return getFilepath(
          path.join('plugin-duplicate', 'node_modules', '@scope', 'b')
        );
      }
    }

    const baseDir = getFilepath('plugin-duplicate');
    app = createApp(path.join('plugin-duplicate', 'release'), {
      Application,
    });
    const loader = app.loader;
    await loader.loadPlugin();
    await loader.loadConfig();

    assert.deepEqual(loader.plugins['a-duplicate'], {
      enable: true,
      name: 'a-duplicate',
      dependencies: [],
      optionalDependencies: ['a'],
      env: [],
      package: '@scope/a',
      path: path.join(baseDir, 'node_modules', '@scope', 'a'),
      from: path.join(baseDir, 'release', 'config', 'plugin.js'),
    });
  });
});
