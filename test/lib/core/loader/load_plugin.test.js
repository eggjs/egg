'use strict';

const path = require('path');
const fs = require('fs');
const mm = require('egg-mock');
const assert = require('assert');
const AppWorkerLoader = require('../../../../').AppWorkerLoader;
const AgentWorkerLoader = require('../../../../').AgentWorkerLoader;
const utils = require('../../../utils');

const EGG_BASE = path.join(__dirname, '../../../../');

describe('test/lib/core/loader/load_plugin.test.js', () => {
  let app;
  const logger = console;
  before(() => {
    app = utils.app('apps/empty');
    return app.ready();
  });
  after(() => app.close());
  afterEach(mm.restore);

  it('should loadConfig all plugins', () => {
    const baseDir = utils.getFilepath('apps/loader-plugin');
    const appLoader = new AppWorkerLoader({
      baseDir,
      app,
      logger,
    });
    appLoader.loadConfig();
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
    assert(
      appLoader.plugins.onerror.path === fs.realpathSync(path.join(EGG_BASE, 'node_modules/egg-onerror'))
    );
    assert(appLoader.plugins.onerror.package === 'egg-onerror');
    assert(/\d+\.\d+\.\d+/.test(appLoader.plugins.onerror.version));
    assert(Array.isArray(appLoader.orderPlugins));
  });

  it('should same name plugin level follow: app > framework > egg', () => {
    const baseDir = utils.getFilepath('apps/loader-plugin');
    const appLoader = new AppWorkerLoader({
      baseDir,
      app,
      logger,
    });
    appLoader.loadConfig();

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

  it('should plguin support alias name', () => {
    const baseDir = utils.getFilepath('apps/loader-plugin');
    const appLoader = new AppWorkerLoader({
      baseDir,
      app,
      logger,
    });
    appLoader.loadConfig();
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

  it('should support package.json config', () => {
    const baseDir = utils.getFilepath('apps/loader-plugin');
    const appLoader = new AppWorkerLoader({
      baseDir,
      app,
      logger,
    });
    appLoader.loadConfig();
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

  it('should show warning message when plugin name wrong', () => {
    let message;
    mm(console, 'warn', m => {
      if (!m.startsWith('[egg:loader] pkg.eggPlugin is missing') && !message) {
        message = m;
      }
    });
    const baseDir = utils.getFilepath('apps/loader-plugin');
    const appLoader = new AppWorkerLoader({
      baseDir,
      app,
      logger,
    });
    appLoader.loadConfig();

    assert(
      message === '[egg:loader] pluginName(e) is different from pluginConfigName(wrong-name)'
    );
  });

  it('should loadConfig plugins with custom plugins config', () => {
    const baseDir = utils.getFilepath('apps/loader-plugin');
    const plugins = {
      foo: {
        enable: true,
        path: path.join(baseDir, 'node_modules/d'),
      },
      d1: {
        env: [ 'unittest' ],
      },
    };
    const appLoader = new AppWorkerLoader({
      baseDir,
      plugins,
      app,
      logger,
    });
    appLoader.loadConfig();

    assert.deepEqual(appLoader.plugins.d1, {
      enable: true,
      name: 'd1',
      package: 'd',
      dependencies: [],
      optionalDependencies: [],
      env: [ 'unittest' ],
      path: path.join(baseDir, 'node_modules/d'),
      from: path.join(baseDir, 'config/plugin.js'),
    });
    assert.deepEqual(appLoader.plugins.foo, {
      enable: true,
      name: 'foo',
      dependencies: [],
      optionalDependencies: [],
      env: [],
      path: path.join(baseDir, 'node_modules/d'),
    });
    assert(!appLoader.plugins.d);
  });

  it('should throw error when plugin not exists', () => {
    assert.throws(function() {
      const baseDir = utils.getFilepath('apps/loader-plugin-noexist');
      const appLoader = new AppWorkerLoader({
        baseDir,
        app,
        logger,
      });
      appLoader.loadConfig();
    }, /Can not find plugin noexist in /);
  });

  it('should throw error when app baseDir not exists', () => {
    assert.throws(function() {
      const baseDir = utils.getFilepath('apps/notexist-app');
      const appLoader = new AppWorkerLoader({
        baseDir,
        app,
        logger,
      });
      appLoader.loadConfig();
    }, /notexist-app not exists/);
  });

  it('should keep plugin list sorted', () => {
    mm(process.env, 'NODE_ENV', 'development');
    const baseDir = utils.getFilepath('apps/loader-plugin-dep');
    const appLoader = new AppWorkerLoader({
      baseDir,
      app,
      logger,
    });
    appLoader.loadConfig();
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

  it('should throw recursive deps error', () => {
    assert.throws(function() {
      const baseDir = utils.getFilepath('apps/loader-plugin-dep-recursive');
      const appLoader = new AppWorkerLoader({
        baseDir,
        app,
        logger,
      });
      appLoader.loadConfig();
    }, /sequencify plugins has problem, missing: \[\], recursive: \[a,b,c,a\]/);
  });

  it('should throw error when plugin dep not exists', function() {
    assert.throws(function() {
      const baseDir = utils.getFilepath('apps/loader-plugin-dep-missing');
      const appLoader = new AppWorkerLoader({
        baseDir,
        app,
        logger,
      });
      appLoader.loadConfig();
    }, /sequencify plugins has problem, missing: \[a1\], recursive: \[\]\s+>> Plugin \[a1\] is disabled or missed, but is required by \[c\]/);
  });

  it('should auto fill plugin infos', () => {
    mm(process.env, 'NODE_ENV', 'test');
    const baseDir = utils.getFilepath('apps/loader-plugin');
    const appLoader1 = new AppWorkerLoader({
      baseDir,
      app,
      logger,
    });
    appLoader1.loadConfig();
    // unittest disable
    const keys1 = appLoader1.orderPlugins.map(plugin => {
      return plugin.name;
    }).join(',');
    assert(keys1.includes('b,c,d1,f,e'));
    assert(!appLoader1.plugins.a1);

    mm(process.env, 'NODE_ENV', 'development');
    const appLoader2 = new AppWorkerLoader({
      baseDir,
      app,
      logger,
    });
    appLoader2.loadConfig();
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

  it('should customize loadPlugin', () => {
    const baseDir = utils.getFilepath('apps/loader-plugin');
    class CustomAppLoader extends AppWorkerLoader {
      loadPlugin() {
        this.hasAppLoadPlugin = true;
        super.loadPlugin();
      }
    }
    const appLoader = new CustomAppLoader({
      baseDir,
      app,
      logger,
    });
    appLoader.loadConfig();
    assert(appLoader.hasAppLoadPlugin === true);

    class CustomAgentLoader extends AgentWorkerLoader {
      loadPlugin() {
        this.hasAgentLoadPlugin = true;
        super.loadPlugin();
      }
    }
    const agentLoader = new CustomAgentLoader({
      baseDir,
      app,
      logger,
    });
    agentLoader.loadConfig();
    assert(agentLoader.hasAgentLoadPlugin === true);
  });
});
