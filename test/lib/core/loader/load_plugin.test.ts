import { strict as assert } from 'node:assert';
import path from 'node:path';
import { mm } from '@eggjs/mock';
import { EggConsoleLogger } from 'egg-logger';
import { MockApplication, createApp, getFilepath } from '../../../utils.js';
import { AppWorkerLoader, AgentWorkerLoader, EggApplicationCore } from '../../../../src/index.js';

const EGG_BASE = getFilepath('../..');

describe('test/lib/core/loader/load_plugin.test.ts', () => {
  let app: MockApplication;
  const logger: any = new EggConsoleLogger();
  before(() => {
    app = createApp('apps/empty');
    return app.ready();
  });
  after(() => app.close());
  afterEach(mm.restore);

  it('should loadConfig all plugins', async () => {
    const baseDir = getFilepath('apps/loader-plugin');
    const appLoader = new AppWorkerLoader({
      env: 'unittest',
      baseDir,
      app: app as unknown as EggApplicationCore,
      logger,
    });
    await appLoader.loadConfig();
    assert.deepEqual(appLoader.plugins.b, {
      enable: true,
      name: 'b',
      dependencies: [],
      optionalDependencies: [],
      env: [],
      path: path.join(baseDir, 'node_modules/b'),
      from: path.join(baseDir, 'config/plugin.js'),
    });
    assert.deepEqual(appLoader.plugins.c, {
      enable: true,
      name: 'c',
      dependencies: [],
      optionalDependencies: [],
      env: [],
      path: path.join(baseDir, 'node_modules/c'),
      from: path.join(baseDir, 'config/plugin.js'),
    });
    assert.deepEqual(appLoader.plugins.e, {
      enable: true,
      name: 'e',
      dependencies: [ 'f' ],
      optionalDependencies: [],
      env: [],
      path: path.join(baseDir, 'plugins/e'),
      from: path.join(baseDir, 'config/plugin.js'),
    });
    assert.equal(
      appLoader.plugins.onerror.path, path.join(EGG_BASE, 'node_modules/egg-onerror'),
    );
    assert(appLoader.plugins.onerror.package === 'egg-onerror');
    assert.match(appLoader.plugins.onerror.version!, /\d+\.\d+\.\d+/);
    assert(Array.isArray(appLoader.orderPlugins));
  });

  it('should same name plugin level follow: app > framework > egg', async () => {
    const baseDir = getFilepath('apps/loader-plugin');
    const appLoader = new AppWorkerLoader({
      env: 'unittest',
      baseDir,
      app: app as unknown as EggApplicationCore,
      logger,
    });
    await appLoader.loadConfig();

    assert.deepEqual(appLoader.plugins.rds, {
      enable: true,
      name: 'rds',
      dependencies: [ 'session' ],
      optionalDependencies: [],
      env: [],
      package: 'rds',
      path: path.join(baseDir, 'node_modules/rds'),
      from: path.join(baseDir, 'config/plugin.js'),
    });
  });

  it('should plugin support alias name', async () => {
    const baseDir = getFilepath('apps/loader-plugin');
    const appLoader = new AppWorkerLoader({
      env: 'unittest',
      baseDir,
      app: app as unknown as EggApplicationCore,
      logger,
    });
    await appLoader.loadConfig();
    assert.deepEqual(appLoader.plugins.d1, {
      enable: true,
      name: 'd1',
      package: 'd',
      dependencies: [],
      optionalDependencies: [],
      env: [],
      path: path.join(baseDir, 'node_modules/d'),
      from: path.join(baseDir, 'config/plugin.js'),
    });
    assert(!appLoader.plugins.d);
  });

  it('should support package.json config', async () => {
    const baseDir = getFilepath('apps/loader-plugin');
    const appLoader = new AppWorkerLoader({
      env: 'unittest',
      baseDir,
      app: app as unknown as EggApplicationCore,
      logger,
    });
    await appLoader.loadConfig();
    assert.deepEqual(appLoader.plugins.g, {
      enable: true,
      name: 'g',
      dependencies: [ 'f' ],
      optionalDependencies: [],
      env: [],
      path: path.join(baseDir, 'plugins/g'),
      from: path.join(baseDir, 'config/plugin.js'),
    });
  });

  it('should show warning message when plugin name wrong', async () => {
    let message: any;
    mm(logger, 'warn', (m: any) => {
      if (m.includes('different') && !message) {
        message = m;
      }
    });
    const baseDir = getFilepath('apps/loader-plugin');
    const appLoader = new AppWorkerLoader({
      env: 'unittest',
      baseDir,
      app: app as unknown as EggApplicationCore,
      logger,
    });
    await appLoader.loadConfig();

    assert(
      message === '[@eggjs/core/egg_loader] pluginName(e) is different from pluginConfigName(wrong-name)',
    );
  });

  it('should loadConfig plugins with custom plugins config', async () => {
    const baseDir = getFilepath('apps/loader-plugin');
    const plugins: any = {
      foo: {
        enable: true,
        path: path.join(baseDir, 'node_modules/d'),
      },
      d1: {
        env: [ 'unittest' ],
      },
    };
    const appLoader = new AppWorkerLoader({
      env: 'unittest',
      baseDir,
      plugins,
      app: app as unknown as EggApplicationCore,
      logger,
    });
    await appLoader.loadConfig();

    assert.deepEqual(appLoader.plugins.d1, {
      enable: true,
      name: 'd1',
      package: 'd',
      dependencies: [],
      optionalDependencies: [],
      env: [ 'unittest' ],
      path: path.join(baseDir, 'node_modules/d'),
      from: '<options.plugins>',
    });
    assert.deepEqual(appLoader.plugins.foo, {
      enable: true,
      name: 'foo',
      dependencies: [],
      optionalDependencies: [],
      env: [],
      path: path.join(baseDir, 'node_modules/d'),
      from: '<options.plugins>',
    });
    assert(!appLoader.plugins.d);
  });

  it('should throw error when plugin not exists', async () => {
    await assert.rejects(async () => {
      const baseDir = getFilepath('apps/loader-plugin-noexist');
      const appLoader = new AppWorkerLoader({
        env: 'unittest',
        baseDir,
        app: app as unknown as EggApplicationCore,
        logger,
      });
      await appLoader.loadConfig();
    }, /Can not find plugin noexist in /);
  });

  it('should throw error when app baseDir not exists', async () => {
    await assert.rejects(async () => {
      const baseDir = getFilepath('apps/notexist-app');
      const appLoader = new AppWorkerLoader({
        env: 'unittest',
        baseDir,
        app: app as unknown as EggApplicationCore,
        logger,
      });
      await appLoader.loadConfig();
    }, /notexist-app not exists/);
  });

  it('should keep plugin list sorted', async () => {
    mm(process.env, 'NODE_ENV', 'development');
    const baseDir = getFilepath('apps/loader-plugin-dep');
    const appLoader = new AppWorkerLoader({
      env: 'local',
      baseDir,
      app: app as unknown as EggApplicationCore,
      logger,
    });
    await appLoader.loadConfig();
    assert.deepEqual(appLoader.orderPlugins.map(plugin => {
      return plugin.name;
    }), [
      'session',
      'security',
      'jsonp',
      'onerror',
      'i18n',
      'watcher',
      'schedule',
      'multipart',
      'development',
      'logrotator',
      'static',
      'view',
      'b',
      'c1',
      'f',
      'a',
      'd',
      'e',
    ]);
  });

  it('should throw recursive deps error', async () => {
    await assert.rejects(async () => {
      const baseDir = getFilepath('apps/loader-plugin-dep-recursive');
      const appLoader = new AppWorkerLoader({
        env: 'unittest',
        baseDir,
        app: app as unknown as EggApplicationCore,
        logger,
      });
      await appLoader.loadConfig();
    }, /sequencify plugins has problem, missing: \[\], recursive: \[a,b,c,a\]/);
  });

  it('should throw error when plugin dep not exists', async () => {
    await assert.rejects(async () => {
      const baseDir = getFilepath('apps/loader-plugin-dep-missing');
      const appLoader = new AppWorkerLoader({
        env: 'unittest',
        baseDir,
        app: app as unknown as EggApplicationCore,
        logger,
      });
      await appLoader.loadConfig();
    }, /sequencify plugins has problem, missing: \[a1\], recursive: \[\]\s+>> Plugin \[a1\] is disabled or missed, but is required by \[c\]/);
  });

  it('should auto fill plugin infos', async () => {
    mm(process.env, 'NODE_ENV', 'test');
    const baseDir = getFilepath('apps/loader-plugin');
    const appLoader1 = new AppWorkerLoader({
      env: 'unittest',
      baseDir,
      app: app as unknown as EggApplicationCore,
      logger,
    });
    await appLoader1.loadConfig();
    // unittest disable
    const keys1 = appLoader1.orderPlugins.map(plugin => {
      return plugin.name;
    }).join(',');
    assert(keys1.includes('b,c,d1,f,e'));
    assert(!appLoader1.plugins.a1);

    mm(process.env, 'NODE_ENV', 'development');
    const appLoader2 = new AppWorkerLoader({
      env: 'local',
      baseDir,
      app: app as unknown as EggApplicationCore,
      logger,
    });
    await appLoader2.loadConfig();
    const keys2 = appLoader2.orderPlugins.map(plugin => {
      return plugin.name;
    }).join(',');
    assert(keys2.includes('d1,a1,b,c,f,e'));
    assert.deepEqual(appLoader2.plugins.a1, {
      enable: true,
      name: 'a1',
      dependencies: [ 'd1' ],
      optionalDependencies: [],
      env: [ 'local', 'prod' ],
      path: path.join(baseDir, 'node_modules/a1'),
      from: path.join(baseDir, 'config/plugin.js'),
    });
  });

  it('should customize loadPlugin', async () => {
    const baseDir = getFilepath('apps/loader-plugin');
    class CustomAppLoader extends AppWorkerLoader {
      hasAppLoadPlugin = false;

      async loadPlugin() {
        this.hasAppLoadPlugin = true;
        return await super.loadPlugin();
      }
    }
    const appLoader = new CustomAppLoader({
      env: 'unittest',
      baseDir,
      app: app as unknown as EggApplicationCore,
      logger,
    });
    await appLoader.loadConfig();
    assert.equal(appLoader.hasAppLoadPlugin, true);

    class CustomAgentLoader extends AgentWorkerLoader {
      hasAgentLoadPlugin = false;
      async loadPlugin() {
        this.hasAgentLoadPlugin = true;
        return await super.loadPlugin();
      }
    }
    const agentLoader = new CustomAgentLoader({
      env: 'unittest',
      baseDir,
      app: app as unknown as EggApplicationCore,
      logger,
    });
    await agentLoader.loadConfig();
    assert.equal(agentLoader.hasAgentLoadPlugin, true);
  });
});
