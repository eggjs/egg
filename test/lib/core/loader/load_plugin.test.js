'use strict';

const should = require('should');
const path = require('path');
const fs = require('fs');
const mm = require('egg-mock');
const AppWorkerLoader = require('../../../../').AppWorkerLoader;
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
    appLoader.plugins.b.should.eql({
      enable: true,
      name: 'b',
      dependencies: [],
      optionalDependencies: [],
      env: [],
      path: path.join(baseDir, 'node_modules/b'),
      from: path.join(baseDir, 'config/plugin.js'),
    });
    appLoader.plugins.c.should.eql({
      enable: true,
      name: 'c',
      dependencies: [],
      optionalDependencies: [],
      env: [],
      path: path.join(baseDir, 'node_modules/c'),
      from: path.join(baseDir, 'config/plugin.js'),
    });
    appLoader.plugins.e.should.eql({
      enable: true,
      name: 'e',
      dependencies: [ 'f' ],
      optionalDependencies: [],
      env: [],
      path: path.join(baseDir, 'plugins/e'),
      from: path.join(baseDir, 'config/plugin.js'),
    });
    appLoader.plugins.onerror.path.should.equal(fs.realpathSync(path.join(EGG_BASE, 'node_modules/egg-onerror')));
    appLoader.plugins.onerror.package.should.equal('egg-onerror');
    appLoader.plugins.onerror.version.should.match(/\d+\.\d+\.\d+/);
    appLoader.orderPlugins.should.be.an.Array;
  });

  it('should same name plugin level follow: app > framework > egg', () => {
    const baseDir = utils.getFilepath('apps/loader-plugin');
    const appLoader = new AppWorkerLoader({
      baseDir,
      app,
      logger,
    });
    appLoader.loadConfig();

    appLoader.plugins.rds.should.eql({
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
    appLoader.plugins.d1.should.eql({
      enable: true,
      name: 'd1',
      package: 'd',
      dependencies: [],
      optionalDependencies: [],
      env: [],
      path: path.join(baseDir, 'node_modules/d'),
      from: path.join(baseDir, 'config/plugin.js'),
    });
    should.not.exists(appLoader.plugins.d);
  });

  it('should support package.json config', () => {
    const baseDir = utils.getFilepath('apps/loader-plugin');
    const appLoader = new AppWorkerLoader({
      baseDir,
      app,
      logger,
    });
    appLoader.loadConfig();
    appLoader.plugins.g.should.eql({
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

    message.should.eql('[egg:loader] pluginName(e) is different from pluginConfigName(wrong-name)');
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

    appLoader.plugins.d1.should.eql({
      enable: true,
      name: 'd1',
      package: 'd',
      dependencies: [],
      optionalDependencies: [],
      env: [ 'unittest' ],
      path: path.join(baseDir, 'node_modules/d'),
      from: path.join(baseDir, 'config/plugin.js'),
    });
    appLoader.plugins.foo.should.eql({
      enable: true,
      name: 'foo',
      dependencies: [],
      optionalDependencies: [],
      env: [],
      path: path.join(baseDir, 'node_modules/d'),
    });
    should.not.exists(appLoader.plugins.d);
  });

  it('should throw error when plugin not exists', () => {
    (function() {
      const baseDir = utils.getFilepath('apps/loader-plugin-noexist');
      const appLoader = new AppWorkerLoader({
        baseDir,
        app,
        logger,
      });
      appLoader.loadConfig();
    }).should.throw(/Can not find plugin noexist in /);
  });

  it('should throw error when app baseDir not exists', () => {
    (function() {
      const baseDir = utils.getFilepath('apps/notexist-app');
      const appLoader = new AppWorkerLoader({
        baseDir,
        app,
        logger,
      });
      appLoader.loadConfig();
    }).should.throw(/notexist-app not exists/);
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
    appLoader.orderPlugins.map(plugin => {
      return plugin.name;
    }).should.eql([
      'onerror',
      'userservice',
      'userrole',
      'session',
      'i18n',
      'validate',
      'watcher',
      'multipart',
      'security',
      'development',
      'schedule',
      'logrotator',
      'static',
      'jsonp',
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
    (function() {
      const baseDir = utils.getFilepath('apps/loader-plugin-dep-recursive');
      const appLoader = new AppWorkerLoader({
        baseDir,
        app,
        logger,
      });
      appLoader.loadConfig();
    }).should.throw('sequencify plugins has problem, missing: [], recursive: [a,b,c,a]');
  });

  it('should throw error when plugin dep not exists', function() {
    (function() {
      const baseDir = utils.getFilepath('apps/loader-plugin-dep-missing');
      const appLoader = new AppWorkerLoader({
        baseDir,
        app,
        logger,
      });
      appLoader.loadConfig();
    }).should.throw('sequencify plugins has problem, missing: [a1], recursive: []\n\t>> Plugin [a1] is disabled or missed, but is required by [c]');
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
    keys1.should.containEql('b,c,d1,f,e');
    should.not.exist(appLoader1.plugins.a1);

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
    keys2.should.containEql('d1,a1,b,c,f,e');
    appLoader2.plugins.a1.should.eql({
      enable: true,
      name: 'a1',
      dependencies: [ 'd1' ],
      optionalDependencies: [],
      env: [ 'local', 'prod' ],
      path: path.join(baseDir, 'node_modules/a1'),
      from: path.join(baseDir, 'config/plugin.js'),
    });
  });
});
