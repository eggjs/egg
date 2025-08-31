import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { debuglog, inspect } from 'node:util';

import { homedir } from 'node-homedir';
import {
  isAsyncFunction,
  isClass,
  isGeneratorFunction,
  isObject,
  isPromise,
} from 'is-type-of';
import type { Logger } from 'egg-logger';
import { getParamNames, readJSONSync, readJSON, exists } from 'utility';
import { extend } from 'extend2';
import {
  Request,
  Response,
  Application,
  Context as KoaContext,
} from '@eggjs/koa';
import { register as tsconfigPathsRegister } from 'tsconfig-paths';
import { isESM, isSupportTypeScript } from '@eggjs/utils';
import { pathMatching, type PathMatchingOptions } from 'egg-path-matching';
import { now, diff } from 'performance-ms';

import {
  type FileLoaderOptions,
  CaseStyle,
  FULLPATH,
  FileLoader,
} from './file_loader.js';
import { type ContextLoaderOptions, ContextLoader } from './context_loader.js';
import utils, { type Fun } from '../utils/index.js';
import { sequencify } from '../utils/sequencify.js';
import { Timing } from '../utils/timing.js';
import type { Context, EggCore, MiddlewareFunc } from '../egg.js';
import type { BaseContextClass } from '../base_context_class.js';
import type { EggAppConfig, EggAppInfo, EggPluginInfo } from '../types.js';

const debug = debuglog('@eggjs/core/loader/egg_loader');

const originalPrototypes: Record<string, unknown> = {
  request: Request.prototype,
  response: Response.prototype,
  context: KoaContext.prototype,
  application: Application.prototype,
};

export interface EggLoaderOptions {
  /** server env */
  env: string;
  /** Application instance */
  app: EggCore;
  EggCoreClass?: typeof EggCore;
  /** the directory of application */
  baseDir: string;
  /** egg logger */
  logger: Logger;
  /** server scope */
  serverScope?: string;
  /** custom plugins */
  plugins?: Record<string, EggPluginInfo>;
}

export type EggDirInfoType = 'app' | 'plugin' | 'framework';

export interface EggDirInfo {
  path: string;
  type: EggDirInfoType;
}

export class EggLoader {
  #requiredCount = 0;
  readonly options: EggLoaderOptions;
  readonly timing: Timing;
  readonly pkg: Record<string, any>;
  readonly eggPaths: string[];
  readonly serverEnv: string;
  readonly serverScope: string;
  readonly appInfo: EggAppInfo;
  dirs?: EggDirInfo[];

  /**
   * @class
   * @param {Object} options - options
   * @param {String} options.baseDir - the directory of application
   * @param {EggCore} options.app - Application instance
   * @param {Logger} options.logger - logger
   * @param {Object} [options.plugins] - custom plugins
   * @since 1.0.0
   */
  constructor(options: EggLoaderOptions) {
    this.options = options;
    assert(
      fs.existsSync(this.options.baseDir),
      `${this.options.baseDir} not exists`
    );
    assert(this.options.app, 'options.app is required');
    assert(this.options.logger, 'options.logger is required');

    this.timing = this.app.timing || new Timing();

    /**
     * @member {Object} EggLoader#pkg
     * @see {@link AppInfo#pkg}
     * @since 1.0.0
     */
    this.pkg = readJSONSync(path.join(this.options.baseDir, 'package.json'));

    // auto require('tsconfig-paths/register') on typescript app
    // support env.EGG_TYPESCRIPT = true or { "egg": { "typescript": true } } on package.json
    if (
      process.env.EGG_TYPESCRIPT === 'true' ||
      (this.pkg.egg && this.pkg.egg.typescript)
    ) {
      // skip require tsconfig-paths if tsconfig.json not exists
      const tsConfigFile = path.join(this.options.baseDir, 'tsconfig.json');
      if (fs.existsSync(tsConfigFile)) {
        // @ts-expect-error only cwd is required
        tsconfigPathsRegister({ cwd: this.options.baseDir });
      } else {
        this.logger.info(
          '[@eggjs/core/egg_loader] skip register "tsconfig-paths" because tsconfig.json not exists at %s',
          tsConfigFile
        );
      }
    }

    /**
     * All framework directories.
     *
     * You can extend Application of egg, the entry point is options.app,
     *
     * loader will find all directories from the prototype of Application,
     * you should define `Symbol.for('egg#eggPath')` property.
     *
     * ```ts
     * // src/example.ts
     * import { Application } from 'egg';
     * class ExampleApplication extends Application {
     *   get [Symbol.for('egg#eggPath')]() {
     *     return baseDir;
     *   }
     * }
     * ```
     * @member {Array} EggLoader#eggPaths
     * @see EggLoader#getEggPaths
     * @since 1.0.0
     */
    this.eggPaths = this.getEggPaths();
    debug('Loaded eggPaths %j', this.eggPaths);

    /**
     * @member {String} EggLoader#serverEnv
     * @see AppInfo#env
     * @since 1.0.0
     */
    this.serverEnv = this.getServerEnv();
    debug('Loaded serverEnv %j', this.serverEnv);

    /**
     * @member {String} EggLoader#serverScope
     * @see AppInfo#serverScope
     */
    this.serverScope = options.serverScope ?? this.getServerScope();

    /**
     * @member {AppInfo} EggLoader#appInfo
     * @since 1.0.0
     */
    this.appInfo = this.getAppInfo();
  }

  get app() {
    return this.options.app;
  }

  get lifecycle() {
    return this.app.lifecycle;
  }

  get logger() {
    return this.options.logger;
  }

  /**
   * Get {@link AppInfo#env}
   * @returns {String} env
   * @see AppInfo#env
   * @private
   * @since 1.0.0
   */
  protected getServerEnv(): string {
    let serverEnv = this.options.env;

    const envPath = path.join(this.options.baseDir, 'config/env');
    if (!serverEnv && fs.existsSync(envPath)) {
      serverEnv = fs.readFileSync(envPath, 'utf8').trim();
    }

    if (!serverEnv && process.env.EGG_SERVER_ENV) {
      serverEnv = process.env.EGG_SERVER_ENV;
    }

    if (serverEnv) {
      serverEnv = serverEnv.trim();
    } else {
      // oxlint-disable-next-line eslint/no-lonely-if
      if (process.env.NODE_ENV === 'test') {
        serverEnv = 'unittest';
      } else if (process.env.NODE_ENV === 'production') {
        serverEnv = 'prod';
      } else {
        serverEnv = 'local';
      }
    }

    return serverEnv;
  }

  /**
   * Get {@link AppInfo#scope}
   * @returns {String} serverScope
   * @private
   */
  protected getServerScope(): string {
    return process.env.EGG_SERVER_SCOPE ?? '';
  }

  /**
   * Get {@link AppInfo#name}
   * @returns {String} appname
   * @private
   * @since 1.0.0
   */
  getAppname(): string {
    if (this.pkg.name) {
      debug('Loaded appname(%s) from package.json', this.pkg.name);
      return this.pkg.name;
    }
    const pkg = path.join(this.options.baseDir, 'package.json');
    throw new Error(`name is required from ${pkg}`);
  }

  /**
   * Get home directory
   * @returns {String} home directory
   * @since 3.4.0
   */
  getHomedir(): string {
    // EGG_HOME for test
    return process.env.EGG_HOME || homedir() || '/home/admin';
  }

  /**
   * Get app info
   * @returns {AppInfo} appInfo
   * @since 1.0.0
   */
  protected getAppInfo(): EggAppInfo {
    const env = this.serverEnv;
    const scope = this.serverScope;
    const home = this.getHomedir();
    const baseDir = this.options.baseDir;

    /**
     * Meta information of the application
     * @class AppInfo
     */
    return {
      /**
       * The name of the application, retrieve from the name property in `package.json`.
       * @member {String} AppInfo#name
       */
      name: this.getAppname(),

      /**
       * The current directory, where the application code is.
       * @member {String} AppInfo#baseDir
       */
      baseDir,

      /**
       * The environment of the application, **it's not NODE_ENV**
       *
       * 1. from `$baseDir/config/env`
       * 2. from EGG_SERVER_ENV
       * 3. from NODE_ENV
       *
       * env | description
       * ---       | ---
       * test      | system integration testing
       * prod      | production
       * local     | local on your own computer
       * unittest  | unit test
       *
       * @member {String} AppInfo#env
       * @see https://eggjs.org/zh-cn/basics/env.html
       */
      env,

      /**
       * @member {String} AppInfo#scope
       */
      scope,

      /**
       * The use directory, same as `process.env.HOME`
       * @member {String} AppInfo#HOME
       */
      HOME: home,

      /**
       * parsed from `package.json`
       * @member {Object} AppInfo#pkg
       */
      pkg: this.pkg,

      /**
       * The directory whether is baseDir or HOME depend on env.
       * it's good for test when you want to write some file to HOME,
       * but don't want to write to the real directory,
       * so use root to write file to baseDir instead of HOME when unittest.
       * keep root directory in baseDir when local and unittest
       * @member {String} AppInfo#root
       */
      root: env === 'local' || env === 'unittest' ? baseDir : home,
    };
  }

  /**
   * Get {@link EggLoader#eggPaths}
   * @returns {Array} framework directories
   * @see {@link EggLoader#eggPaths}
   * @private
   * @since 1.0.0
   */
  protected getEggPaths(): string[] {
    // avoid require recursively
    const EggCore = this.options.EggCoreClass;
    const eggPaths: string[] = [];

    let proto = this.app;

    // Loop for the prototype chain
    while (proto) {
      proto = Object.getPrototypeOf(proto);
      // stop the loop if
      // - object extends Object
      // - object extends EggCore
      if (proto === Object.prototype || proto === EggCore?.prototype) {
        break;
      }
      const eggPath = Reflect.get(proto, Symbol.for('egg#eggPath'));
      if (!eggPath) {
        // if (EggCore) {
        //   throw new TypeError('Symbol.for(\'egg#eggPath\') is required on Application');
        // }
        continue;
      }
      assert(
        typeof eggPath === 'string',
        "Symbol.for('egg#eggPath') should be string"
      );
      assert(fs.existsSync(eggPath), `${eggPath} not exists`);
      const realpath = fs.realpathSync(eggPath);
      if (!eggPaths.includes(realpath)) {
        eggPaths.unshift(realpath);
      }
    }
    return eggPaths;
  }

  /** start Plugin loader */
  lookupDirs: Set<string>;
  eggPlugins: Record<string, EggPluginInfo>;
  appPlugins: Record<string, EggPluginInfo>;
  customPlugins: Record<string, EggPluginInfo>;
  allPlugins: Record<string, EggPluginInfo>;
  orderPlugins: EggPluginInfo[];
  /** enable plugins */
  plugins: Record<string, EggPluginInfo>;

  /**
   * Load config/plugin.js from {EggLoader#loadUnits}
   *
   * plugin.js is written below
   *
   * ```js
   * {
   *   'xxx-client': {
   *     enable: true,
   *     package: 'xxx-client',
   *     dep: [],
   *     env: [],
   *   },
   *   // short hand
   *   'rds': false,
   *   'depd': {
   *     enable: true,
   *     path: 'path/to/depd'
   *   }
   * }
   * ```
   *
   * If the plugin has path, Loader will find the module from it.
   *
   * Otherwise Loader will lookup follow the order by packageName
   *
   * 1. $APP_BASE/node_modules/${package}
   * 2. $EGG_BASE/node_modules/${package}
   *
   * You can call `loader.plugins` that retrieve enabled plugins.
   *
   * ```js
   * loader.plugins['xxx-client'] = {
   *   name: 'xxx-client',                 // the plugin name, it can be used in `dep`
   *   package: 'xxx-client',              // the package name of plugin
   *   enable: true,                       // whether enabled
   *   path: 'path/to/xxx-client',         // the directory of the plugin package
   *   dep: [],                            // the dependent plugins, you can use the plugin name
   *   env: [ 'local', 'unittest' ],       // specify the serverEnv that only enable the plugin in it
   * }
   * ```
   *
   * `loader.allPlugins` can be used when retrieve all plugins.
   * @function EggLoader#loadPlugin
   * @since 1.0.0
   */
  async loadPlugin() {
    this.timing.start('Load Plugin');

    this.lookupDirs = this.getLookupDirs();
    this.allPlugins = {};
    this.eggPlugins = await this.loadEggPlugins();
    this.appPlugins = await this.loadAppPlugins();
    this.customPlugins = this.loadCustomPlugins();

    this.#extendPlugins(this.allPlugins, this.eggPlugins);
    this.#extendPlugins(this.allPlugins, this.appPlugins);
    this.#extendPlugins(this.allPlugins, this.customPlugins);

    const enabledPluginNames: string[] = []; // enabled plugins that configured explicitly
    const plugins: Record<string, EggPluginInfo> = {};
    const env = this.serverEnv;
    for (const name in this.allPlugins) {
      const plugin = this.allPlugins[name];

      // resolve the real plugin.path based on plugin or package
      plugin.path = this.getPluginPath(plugin);

      // read plugin information from ${plugin.path}/package.json
      await this.#mergePluginConfig(plugin);

      // disable the plugin that not match the serverEnv
      if (env && plugin.env.length > 0 && !plugin.env.includes(env)) {
        this.logger.info(
          '[@eggjs/core] Plugin %o is disabled by env unmatched, require env(%o) but got env is %o',
          name,
          plugin.env,
          env
        );
        plugin.enable = false;
        continue;
      }

      plugins[name] = plugin;
      if (plugin.enable) {
        enabledPluginNames.push(name);
      }
    }

    // retrieve the ordered plugins
    this.orderPlugins = this.getOrderPlugins(
      plugins,
      enabledPluginNames,
      this.appPlugins
    );

    const enablePlugins: Record<string, EggPluginInfo> = {};
    for (const plugin of this.orderPlugins) {
      enablePlugins[plugin.name] = plugin;
    }
    debug('Loaded enable plugins: %j', Object.keys(enablePlugins));

    /**
     * Retrieve enabled plugins
     * @member {Object} EggLoader#plugins
     * @since 1.0.0
     */
    this.plugins = enablePlugins;
    this.timing.end('Load Plugin');
  }

  protected async loadAppPlugins() {
    // loader plugins from application
    const appPlugins = await this.readPluginConfigs(
      path.join(this.options.baseDir, 'config/plugin.default')
    );
    debug(
      'Loaded app plugins: %j',
      Object.keys(appPlugins).map(k => `${k}:${appPlugins[k].enable}`)
    );
    return appPlugins;
  }

  protected async loadEggPlugins() {
    // loader plugins from framework
    const eggPluginConfigPaths = this.eggPaths.map(eggPath =>
      path.join(eggPath, 'config/plugin.default')
    );
    const eggPlugins = await this.readPluginConfigs(eggPluginConfigPaths);
    debug(
      'Loaded egg plugins: %j',
      Object.keys(eggPlugins).map(k => `${k}:${eggPlugins[k].enable}`)
    );
    return eggPlugins;
  }

  protected loadCustomPlugins() {
    // loader plugins from process.env.EGG_PLUGINS
    let customPlugins: Record<string, EggPluginInfo> = {};
    const configPaths: string[] = [];
    if (process.env.EGG_PLUGINS) {
      try {
        customPlugins = JSON.parse(process.env.EGG_PLUGINS);
        configPaths.push('<process.env.EGG_PLUGINS>');
      } catch (e) {
        debug('parse EGG_PLUGINS failed, %s', e);
      }
    }

    // loader plugins from options.plugins
    if (this.options.plugins) {
      customPlugins = {
        ...customPlugins,
        ...this.options.plugins,
      };
      configPaths.push('<options.plugins>');
    }

    if (customPlugins) {
      const configPath = configPaths.join(' or ');
      for (const name in customPlugins) {
        this.#normalizePluginConfig(customPlugins, name, configPath);
      }
      debug('Loaded custom plugins: %o', customPlugins);
    }
    return customPlugins;
  }

  /*
   * Read plugin.js from multiple directory
   */
  protected async readPluginConfigs(configPaths: string[] | string) {
    if (!Array.isArray(configPaths)) {
      configPaths = [configPaths];
    }

    // Get all plugin configurations
    // plugin.default.js
    // plugin.${scope}.js
    // plugin.${env}.js
    // plugin.${scope}_${env}.js
    const newConfigPaths: string[] = [];
    for (const filename of this.getTypeFiles('plugin')) {
      for (let configPath of configPaths) {
        configPath = path.join(path.dirname(configPath), filename);
        newConfigPaths.push(configPath);
      }
    }

    const plugins: Record<string, EggPluginInfo> = {};
    for (const configPath of newConfigPaths) {
      let filepath = this.resolveModule(configPath);

      // let plugin.js compatible
      if (configPath.endsWith('plugin.default') && !filepath) {
        filepath = this.resolveModule(
          configPath.replace(/plugin\.default$/, 'plugin')
        );
      }

      if (!filepath) {
        continue;
      }

      const config = (await utils.loadFile(filepath)) as Record<
        string,
        EggPluginInfo
      >;
      for (const name in config) {
        this.#normalizePluginConfig(config, name, filepath);
      }
      this.#extendPlugins(plugins, config);
    }

    return plugins;
  }

  #normalizePluginConfig(
    plugins: Record<string, EggPluginInfo | boolean>,
    name: string,
    configPath: string
  ) {
    const plugin = plugins[name];

    // plugin_name: false
    if (typeof plugin === 'boolean') {
      plugins[name] = {
        name,
        enable: plugin,
        dependencies: [],
        optionalDependencies: [],
        env: [],
        from: configPath,
      } satisfies EggPluginInfo;
      return;
    }

    if (!('enable' in plugin)) {
      Reflect.set(plugin, 'enable', true);
    }
    plugin.name = name;
    plugin.dependencies = plugin.dependencies || [];
    plugin.optionalDependencies = plugin.optionalDependencies || [];
    plugin.env = plugin.env || [];
    plugin.from = plugin.from || configPath;
    depCompatible(plugin);
  }

  // Read plugin information from package.json and merge
  // {
  //   eggPlugin: {
  //     "name": "",     plugin name, must be same as name in config/plugin.js
  //     "dep": [],      dependent plugins
  //     "env": ""       env
  //     "strict": true, whether check plugin name, default to true.
  //   }
  // }
  async #mergePluginConfig(plugin: EggPluginInfo) {
    let pkg;
    let config;
    const pluginPackage = path.join(plugin.path as string, 'package.json');
    if (await utils.existsPath(pluginPackage)) {
      pkg = await readJSON(pluginPackage);
      config = pkg.eggPlugin;
      if (pkg.version) {
        plugin.version = pkg.version;
      }
      // support commonjs and esm dist files
      plugin.path = await this.#formatPluginPathFromPackageJSON(
        plugin.path as string,
        pkg
      );
    }

    const logger = this.options.logger;
    if (!config) {
      logger.warn(
        `[@eggjs/core/egg_loader] pkg.eggPlugin is missing in ${pluginPackage}`
      );
      return;
    }

    if (config.name && config.strict !== false && config.name !== plugin.name) {
      // pluginName is configured in config/plugin.js
      // pluginConfigName is pkg.eggPlugin.name
      logger.warn(
        `[@eggjs/core/egg_loader] pluginName(${plugin.name}) is different from pluginConfigName(${config.name})`
      );
    }

    // dep compatible
    depCompatible(config);

    for (const key of ['dependencies', 'optionalDependencies', 'env']) {
      const values = config[key];
      const existsValues = Reflect.get(plugin, key);
      if (Array.isArray(values) && !existsValues?.length) {
        Reflect.set(plugin, key, values);
      }
    }
  }

  protected getOrderPlugins(
    allPlugins: Record<string, EggPluginInfo>,
    enabledPluginNames: string[],
    appPlugins: Record<string, EggPluginInfo>
  ) {
    // no plugins enabled
    if (enabledPluginNames.length === 0) {
      return [];
    }

    const result = sequencify(allPlugins, enabledPluginNames);
    debug('Got plugins %j after sequencify', result);

    // catch error when result.sequence is empty
    if (result.sequence.length === 0) {
      const err = new Error(
        `sequencify plugins has problem, missing: [${result.missingTasks}], recursive: [${result.recursiveDependencies}]`
      );
      // find plugins which is required by the missing plugin
      for (const missName of result.missingTasks) {
        const requires = [];
        for (const name in allPlugins) {
          if (allPlugins[name].dependencies.includes(missName)) {
            requires.push(name);
          }
        }
        err.message += `\n\t>> Plugin [${missName}] is disabled or missed, but is required by [${requires}]`;
      }

      err.name = 'PluginSequencifyError';
      throw err;
    }

    // log the plugins that be enabled implicitly
    const implicitEnabledPlugins: string[] = [];
    const requireMap: Record<string, string[]> = {};
    for (const name of result.sequence) {
      for (const depName of allPlugins[name].dependencies) {
        if (!requireMap[depName]) {
          requireMap[depName] = [];
        }
        requireMap[depName].push(name);
      }

      if (!allPlugins[name].enable) {
        implicitEnabledPlugins.push(name);
        allPlugins[name].enable = true;
        allPlugins[name].implicitEnable = true;
      }
    }

    for (const [name, dependents] of Object.entries(requireMap)) {
      // note:`dependents` will not includes `optionalDependencies`
      allPlugins[name].dependents = dependents;
    }

    // Following plugins will be enabled implicitly.
    //   - configclient required by [rpcClient]
    //   - monitor required by [rpcClient]
    //   - diamond required by [rpcClient]
    if (implicitEnabledPlugins.length > 0) {
      let message = implicitEnabledPlugins
        .map(name => `  - ${name} required by [${requireMap[name]}]`)
        .join('\n');
      this.options.logger.info(
        `Following plugins will be enabled implicitly.\n${message}`
      );

      // should warn when the plugin is disabled by app
      const disabledPlugins = implicitEnabledPlugins.filter(
        name => appPlugins[name] && appPlugins[name].enable === false
      );
      if (disabledPlugins.length > 0) {
        message = disabledPlugins
          .map(name => `  - ${name} required by [${requireMap[name]}]`)
          .join('\n');
        this.options.logger.warn(
          `Following plugins will be enabled implicitly that is disabled by application.\n${message}`
        );
      }
    }

    return result.sequence.map(name => allPlugins[name]);
  }

  protected getLookupDirs() {
    const lookupDirs = new Set<string>();

    // try to locate the plugin in the following directories's node_modules
    // -> {APP_PATH} -> {EGG_PATH} -> $CWD
    lookupDirs.add(this.options.baseDir);

    // try to locate the plugin at framework from upper to lower
    for (let i = this.eggPaths.length - 1; i >= 0; i--) {
      const eggPath = this.eggPaths[i];
      lookupDirs.add(eggPath);
    }

    // should find the $cwd when test the plugins under npm3
    lookupDirs.add(process.cwd());
    return lookupDirs;
  }

  // Get the real plugin path
  protected getPluginPath(plugin: EggPluginInfo) {
    if (plugin.path) {
      return plugin.path;
    }

    if (plugin.package) {
      assert(
        isValidatePackageName(plugin.package),
        `plugin ${plugin.name} invalid, use 'path' instead of package: "${plugin.package}"`
      );
    }
    return this.#resolvePluginPath(plugin);
  }

  #resolvePluginPath(plugin: EggPluginInfo) {
    const name = plugin.package || plugin.name;
    try {
      // should find the plugin directory
      // pnpm will lift the node_modules to the sibling directory
      // 'node_modules/.pnpm/yadan@2.0.0/node_modules/yadan/node_modules',
      // 'node_modules/.pnpm/yadan@2.0.0/node_modules',  <- this is the sibling directory
      // 'node_modules/.pnpm/egg@2.33.1/node_modules/egg/node_modules',
      // 'node_modules/.pnpm/egg@2.33.1/node_modules', <- this is the sibling directory
      const pluginPkgFile = utils.resolvePath(`${name}/package.json`, {
        paths: [...this.lookupDirs],
      });
      return path.dirname(pluginPkgFile);
    } catch (err) {
      debug('[resolvePluginPath] error: %o, plugin info: %o', err, plugin);
      throw new Error(
        `Can not find plugin ${name} in "${[...this.lookupDirs].join(', ')}"`,
        {
          cause: err,
        }
      );
    }
  }

  async #formatPluginPathFromPackageJSON(
    pluginPath: string,
    pluginPkg: {
      eggPlugin?: {
        exports?: {
          import?: string;
          require?: string;
          typescript?: string;
        };
      };
    }
  ): Promise<string> {
    let realPluginPath = pluginPath;
    const exports = pluginPkg.eggPlugin?.exports;
    if (exports) {
      if (isESM) {
        if (exports.import) {
          realPluginPath = path.join(pluginPath, exports.import);
        }
      } else if (exports.require) {
        realPluginPath = path.join(pluginPath, exports.require);
      }
      if (
        exports.typescript &&
        isSupportTypeScript() &&
        !(await exists(realPluginPath))
      ) {
        // if require/import path not exists, use typescript path for development stage
        realPluginPath = path.join(pluginPath, exports.typescript);
        debug(
          '[formatPluginPathFromPackageJSON] use typescript path %o',
          realPluginPath
        );
      }
    }
    return realPluginPath;
  }

  #extendPlugins(
    targets: Record<string, EggPluginInfo>,
    plugins: Record<string, EggPluginInfo>
  ) {
    if (!plugins) {
      return;
    }
    for (const name in plugins) {
      const plugin = plugins[name];
      let targetPlugin = targets[name];
      if (!targetPlugin) {
        targetPlugin = {} as EggPluginInfo;
        targets[name] = targetPlugin;
      }
      if (targetPlugin.package && targetPlugin.package === plugin.package) {
        this.logger.warn(
          '[@eggjs/core] plugin %s has been defined that is %j, but you define again in %s',
          name,
          targetPlugin,
          plugin.from
        );
      }
      if (plugin.path || plugin.package) {
        delete targetPlugin.path;
        delete targetPlugin.package;
      }
      for (const [prop, value] of Object.entries(plugin)) {
        if (value === undefined) {
          continue;
        }
        if (
          Reflect.get(targetPlugin, prop) &&
          Array.isArray(value) &&
          value.length === 0
        ) {
          continue;
        }
        Reflect.set(targetPlugin, prop, value);
      }
    }
  }
  /** end Plugin loader */

  /** start Config loader */
  configMeta: Record<string, any>;
  config: EggAppConfig;

  /**
   * Load config/config.js
   *
   * Will merge config.default.js 和 config.${env}.js
   *
   * @function EggLoader#loadConfig
   * @since 1.0.0
   */
  async loadConfig() {
    this.timing.start('Load Config');
    this.configMeta = {};

    const target: EggAppConfig = {
      middleware: [],
      coreMiddleware: [],
    };

    // Load Application config first
    const appConfig = await this.#preloadAppConfig();

    //   plugin config.default
    //     framework config.default
    //       app config.default
    //         plugin config.{env}
    //           framework config.{env}
    //             app config.{env}
    for (const filename of this.getTypeFiles('config')) {
      for (const unit of this.getLoadUnits()) {
        const isApp = unit.type === 'app';
        const config = await this.#loadConfig(
          unit.path,
          filename,
          isApp ? undefined : appConfig,
          unit.type
        );
        if (!config) {
          continue;
        }
        debug(
          '[loadConfig] Loaded config %s/%s, %j',
          unit.path,
          filename,
          config
        );
        extend(true, target, config);
      }
    }

    // load env from process.env.EGG_APP_CONFIG
    const envConfig = this.#loadConfigFromEnv();
    debug('[loadConfig] Loaded config from env, %j', envConfig);
    extend(true, target, envConfig);

    // You can manipulate the order of app.config.coreMiddleware and app.config.appMiddleware in app.js
    target.coreMiddleware = target.coreMiddleware || [];
    // alias for coreMiddleware
    target.coreMiddlewares = target.coreMiddleware;

    target.appMiddleware = target.middleware || [];
    // alias for appMiddleware
    target.appMiddlewares = target.appMiddleware;

    this.config = target;
    debug('[loadConfig] all config: %o', this.config);
    this.timing.end('Load Config');
  }

  async #preloadAppConfig() {
    const names = ['config.default', `config.${this.serverEnv}`];
    const target: Record<string, any> = {};
    for (const filename of names) {
      const config = await this.#loadConfig(
        this.options.baseDir,
        filename,
        undefined,
        'app'
      );
      if (!config) {
        continue;
      }
      extend(true, target, config);
    }
    return target;
  }

  async #loadConfig(
    dirpath: string,
    filename: string,
    extraInject: object | undefined,
    type: EggDirInfoType
  ) {
    const isPlugin = type === 'plugin';
    const isApp = type === 'app';

    let filepath = this.resolveModule(path.join(dirpath, 'config', filename));
    // let config.js compatible
    if (filename === 'config.default' && !filepath) {
      filepath = this.resolveModule(path.join(dirpath, 'config/config'));
    }
    if (!filepath) {
      return;
    }
    const config: Record<string, any> = await this.loadFile(
      filepath,
      this.appInfo,
      extraInject
    );
    if (!config) return;
    if (isPlugin || isApp) {
      assert(
        !config.coreMiddleware,
        'Can not define coreMiddleware in app or plugin'
      );
    }
    if (!isApp) {
      assert(!config.middleware, 'Can not define middleware in ' + filepath);
    }
    // store config meta, check where is the property of config come from.
    this.#setConfigMeta(config, filepath);
    return config;
  }

  #loadConfigFromEnv() {
    const envConfigStr = process.env.EGG_APP_CONFIG;
    if (!envConfigStr) return;
    try {
      const envConfig: Record<string, unknown> = JSON.parse(envConfigStr);
      this.#setConfigMeta(envConfig, '<process.env.EGG_APP_CONFIG>');
      return envConfig;
    } catch {
      this.options.logger.warn(
        '[egg-loader] process.env.EGG_APP_CONFIG is not invalid JSON: %s',
        envConfigStr
      );
    }
  }

  #setConfigMeta(config: Record<string, unknown>, filepath: string) {
    config = extend(true, {}, config);
    this.#setConfig(config, filepath);
    extend(true, this.configMeta, config);
  }

  #setConfig(obj: Record<string, any>, filepath: string) {
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      // ignore console
      if (
        key === 'console' &&
        val &&
        typeof val.Console === 'function' &&
        val.Console === console.Console
      ) {
        obj[key] = filepath;
        continue;
      }
      if (
        val &&
        Object.getPrototypeOf(val) === Object.prototype &&
        Object.keys(val).length > 0
      ) {
        this.#setConfig(val, filepath);
        continue;
      }
      obj[key] = filepath;
    }
  }
  /** end Config loader */

  /** start Extend loader */
  /**
   * mixin Agent.prototype
   * @function EggLoader#loadAgentExtend
   * @since 1.0.0
   */
  async loadAgentExtend() {
    await this.loadExtend('agent', this.app);
  }

  /**
   * mixin Application.prototype
   * @function EggLoader#loadApplicationExtend
   * @since 1.0.0
   */
  async loadApplicationExtend() {
    await this.loadExtend('application', this.app);
  }

  /**
   * mixin Request.prototype
   * @function EggLoader#loadRequestExtend
   * @since 1.0.0
   */
  async loadRequestExtend() {
    await this.loadExtend('request', this.app.request);
  }

  /**
   * mixin Response.prototype
   * @function EggLoader#loadResponseExtend
   * @since 1.0.0
   */
  async loadResponseExtend() {
    await this.loadExtend('response', this.app.response);
  }

  /**
   * mixin Context.prototype
   * @function EggLoader#loadContextExtend
   * @since 1.0.0
   */
  async loadContextExtend() {
    await this.loadExtend('context', this.app.context);
  }

  /**
   * mixin app.Helper.prototype
   * @function EggLoader#loadHelperExtend
   * @since 1.0.0
   */
  async loadHelperExtend() {
    if (this.app.Helper) {
      await this.loadExtend('helper', this.app.Helper.prototype);
    }
  }

  /**
   * Find all extend file paths by name
   * can be override in top level framework to support load `app/extends/{name}.js`
   *
   * @param {String} name - filename which may be `app/extend/{name}.js`
   * @returns {Array} filepaths extend file paths
   * @private
   */
  protected getExtendFilePaths(name: string): string[] {
    return this.getLoadUnits().map(unit =>
      path.join(unit.path, 'app/extend', name)
    );
  }

  /**
   * Loader app/extend/xx.js to `prototype`,
   * @function loadExtend
   * @param {String} name - filename which may be `app/extend/{name}.js`
   * @param {Object} proto - prototype that mixed
   * @since 1.0.0
   */
  async loadExtend(name: string, proto: object) {
    this.timing.start(`Load extend/${name}.js`);
    // All extend files
    const filepaths = this.getExtendFilePaths(name);
    // if use mm.env and serverEnv is not unittest
    const needUnittest =
      'EGG_MOCK_SERVER_ENV' in process.env && this.serverEnv !== 'unittest';
    const length = filepaths.length;
    for (let i = 0; i < length; i++) {
      const filepath = filepaths[i];
      filepaths.push(filepath + `.${this.serverEnv}`);
      if (needUnittest) {
        filepaths.push(filepath + '.unittest');
      }
    }
    debug('loadExtend %s, filepaths: %j', name, filepaths);

    const mergeRecord = new Map();
    for (const rawFilepath of filepaths) {
      const filepath = this.resolveModule(rawFilepath);
      if (!filepath) {
        // debug('loadExtend %o not found', rawFilepath);
        continue;
      }
      if (filepath.endsWith('/index.js')) {
        this.app.deprecate(
          `app/extend/${name}/index.js is deprecated, use app/extend/${name}.js instead`
        );
      } else if (filepath.endsWith('/index.ts')) {
        this.app.deprecate(
          `app/extend/${name}/index.ts is deprecated, use app/extend/${name}.ts instead`
        );
      }

      let ext = await this.requireFile(filepath);
      // if extend object is Class, should use Class.prototype instead
      if (isClass(ext)) {
        ext = ext.prototype;
      }
      const properties = Object.getOwnPropertyNames(ext)
        .concat(Object.getOwnPropertySymbols(ext) as unknown as string[])
        .filter(name => name !== 'constructor'); // ignore class constructor for extend

      for (const property of properties) {
        if (mergeRecord.has(property)) {
          debug(
            'Property: "%s" already exists in "%s"，it will be redefined by "%s"',
            property,
            mergeRecord.get(property),
            filepath
          );
        }

        // Copy descriptor
        let descriptor = Object.getOwnPropertyDescriptor(
          ext,
          property
        ) as PropertyDescriptor;
        let originalDescriptor = Object.getOwnPropertyDescriptor(
          proto,
          property
        );
        if (!originalDescriptor) {
          // try to get descriptor from originalPrototypes
          const originalProto = originalPrototypes[name];
          if (originalProto) {
            originalDescriptor = Object.getOwnPropertyDescriptor(
              originalProto,
              property
            );
          }
        }
        if (originalDescriptor) {
          // don't override descriptor
          descriptor = {
            ...descriptor,
          };
          if (!descriptor.set && originalDescriptor.set) {
            descriptor.set = originalDescriptor.set;
          }
          if (!descriptor.get && originalDescriptor.get) {
            descriptor.get = originalDescriptor.get;
          }
        }
        Object.defineProperty(proto, property, descriptor);
        mergeRecord.set(property, filepath);
      }
      debug('merge %j to %s from %s', properties, name, filepath);
    }
    this.timing.end(`Load extend/${name}.js`);
  }
  /** end Extend loader */

  /** start Custom loader */
  /**
   * load app.js
   *
   * @example
   * - old:
   *
   * ```js
   * module.exports = function(app) {
   *   doSomething();
   * }
   * ```
   *
   * - new:
   *
   * ```js
   * module.exports = class Boot {
   *   constructor(app) {
   *     this.app = app;
   *   }
   *   configDidLoad() {
   *     doSomething();
   *   }
   * }
   * @since 1.0.0
   */
  async loadCustomApp() {
    await this.#loadBootHook('app');
    this.lifecycle.triggerConfigWillLoad();
  }

  /**
   * Load agent.js, same as {@link EggLoader#loadCustomApp}
   */
  async loadCustomAgent() {
    await this.#loadBootHook('agent');
    this.lifecycle.triggerConfigWillLoad();
  }

  // FIXME: no logger used after egg removed
  loadBootHook() {
    // do nothing
  }

  async #loadBootHook(fileName: string) {
    this.timing.start(`Load ${fileName}.js`);
    for (const unit of this.getLoadUnits()) {
      const bootFile = path.join(unit.path, fileName);
      const bootFilePath = this.resolveModule(bootFile);
      if (!bootFilePath) {
        // debug('[loadBootHook] %o not found', bootFile);
        continue;
      }
      const bootHook = await this.requireFile(bootFilePath);
      if (isClass(bootHook)) {
        bootHook.prototype.fullPath = bootFilePath;
        // if is boot class, add to lifecycle
        this.lifecycle.addBootHook(bootHook);
        debug('[loadBootHook] add BootHookClass from %o', bootFilePath);
      } else if (typeof bootHook === 'function') {
        // if is boot function, wrap to class
        // for compatibility
        this.lifecycle.addFunctionAsBootHook(bootHook, bootFilePath);
        debug('[loadBootHook] add bootHookFunction from %o', bootFilePath);
      } else {
        this.options.logger.warn(
          '[@eggjs/core/egg_loader] %s must exports a boot class',
          bootFilePath
        );
      }
    }
    // init boots
    this.lifecycle.init();
    this.timing.end(`Load ${fileName}.js`);
  }
  /** end Custom loader */

  /** start Service loader */
  /**
   * Load app/service
   * @function EggLoader#loadService
   * @param {Object} options - LoaderOptions
   * @since 1.0.0
   */
  async loadService(options?: Partial<ContextLoaderOptions>) {
    this.timing.start('Load Service');
    // 载入到 app.serviceClasses
    const servicePaths = this.getLoadUnits().map(unit =>
      path.join(unit.path, 'app/service')
    );
    options = {
      call: true,
      caseStyle: CaseStyle.lower,
      fieldClass: 'serviceClasses',
      directory: servicePaths,
      ...options,
    };
    debug('[loadService] options: %o', options);
    await this.loadToContext(
      servicePaths,
      'service',
      options as ContextLoaderOptions
    );
    this.timing.end('Load Service');
  }
  /** end Service loader */

  /** start Middleware loader */
  /**
   * Load app/middleware
   *
   * app.config.xx is the options of the middleware xx that has same name as config
   *
   * @function EggLoader#loadMiddleware
   * @param {Object} opt - LoaderOptions
   * @example
   * ```js
   * // app/middleware/status.js
   * module.exports = function(options, app) {
   *   // options == app.config.status
   *   return async next => {
   *     await next();
   *   }
   * }
   * ```
   * @since 1.0.0
   */
  async loadMiddleware(opt?: Partial<FileLoaderOptions>) {
    this.timing.start('Load Middleware');
    const app = this.app;

    // load middleware to app.middleware
    const middlewarePaths = this.getLoadUnits().map(unit =>
      path.join(unit.path, 'app/middleware')
    );
    opt = {
      call: false,
      override: true,
      caseStyle: CaseStyle.lower,
      directory: middlewarePaths,
      ...opt,
    };
    await this.loadToApp(
      middlewarePaths,
      'middlewares',
      opt as FileLoaderOptions
    );

    for (const name in app.middlewares) {
      Object.defineProperty(app.middleware, name, {
        get() {
          return app.middlewares[name];
        },
        enumerable: false,
        configurable: false,
      });
    }

    this.options.logger.info(
      'Use coreMiddleware order: %j',
      this.config.coreMiddleware
    );
    this.options.logger.info(
      'Use appMiddleware order: %j',
      this.config.appMiddleware
    );

    // use middleware ordered by app.config.coreMiddleware and app.config.appMiddleware
    const middlewareNames = this.config.coreMiddleware.concat(
      this.config.appMiddleware
    );
    debug('[loadMiddleware] middlewareNames: %j', middlewareNames);
    const middlewaresMap = new Map<string, boolean>();
    for (const name of middlewareNames) {
      const createMiddleware = app.middlewares[name];
      if (!createMiddleware) {
        throw new TypeError(`Middleware ${name} not found`);
      }
      if (middlewaresMap.has(name)) {
        throw new TypeError(`Middleware ${name} redefined`);
      }
      middlewaresMap.set(name, true);
      const options = this.config[name] || {};
      let mw: MiddlewareFunc | null = createMiddleware(options, app);
      assert(
        typeof mw === 'function',
        `Middleware ${name} must be a function, but actual is ${inspect(mw)}`
      );
      if (isGeneratorFunction(mw)) {
        const fullpath = Reflect.get(createMiddleware, FULLPATH);
        throw new TypeError(
          `Support for generators was removed, middleware: ${name}, fullpath: ${fullpath}`
        );
      }
      mw._name = name;
      // middlewares support options.enable, options.ignore and options.match
      mw = wrapMiddleware(mw, options);
      if (mw) {
        if (debug.enabled) {
          // show mw debug log on every request
          mw = debugMiddlewareWrapper(mw);
        }
        app.use(mw);
        debug(
          '[loadMiddleware] Use middleware: %s with options: %j',
          name,
          options
        );
        this.options.logger.info(
          '[@eggjs/core/egg_loader] Use middleware: %s',
          name
        );
      } else {
        this.options.logger.info(
          '[@eggjs/core/egg_loader] Disable middleware: %s',
          name
        );
      }
    }

    this.options.logger.info(
      '[@eggjs/core/egg_loader] Loaded middleware from %j',
      middlewarePaths
    );
    this.timing.end('Load Middleware');

    // add router middleware, make sure router is the last middleware
    const mw = this.app.router.middleware();
    Reflect.set(mw, '_name', 'routerMiddleware');
    this.app.use(mw);
  }
  /** end Middleware loader */

  /** start Controller loader */
  /**
   * Load app/controller
   * @param {Object} opt - LoaderOptions
   * @since 1.0.0
   */
  async loadController(opt?: Partial<FileLoaderOptions>) {
    this.timing.start('Load Controller');
    const controllerBase = path.join(this.options.baseDir, 'app/controller');
    opt = {
      caseStyle: CaseStyle.lower,
      directory: controllerBase,
      initializer: (obj, opt) => {
        // return class if it exports a function
        // ```js
        // module.exports = app => {
        //   return class HomeController extends app.Controller {};
        // }
        // ```
        if (isGeneratorFunction(obj)) {
          throw new TypeError(
            `Support for generators was removed, fullpath: ${opt.path}`
          );
        }
        if (
          !isClass(obj) &&
          !isAsyncFunction(obj) &&
          typeof obj === 'function'
        ) {
          obj = obj(this.app);
          debug('[loadController] after init(app) => %o, meta: %j', obj, opt);
          if (isGeneratorFunction(obj)) {
            throw new TypeError(
              `Support for generators was removed, fullpath: ${opt.path}`
            );
          }
        }
        if (isClass(obj)) {
          obj.prototype.pathName = opt.pathName;
          obj.prototype.fullPath = opt.path;
          return wrapControllerClass(obj, opt.path);
        }
        if (isObject(obj)) {
          return wrapObject(obj, opt.path);
        }
        if (isAsyncFunction(obj)) {
          return wrapObject({ 'module.exports': obj }, opt.path)[
            'module.exports'
          ];
        }
        return obj;
      },
      ...opt,
    };
    await this.loadToApp(
      controllerBase,
      'controller',
      opt as FileLoaderOptions
    );
    debug('[loadController] app.controller => %o', this.app.controller);
    this.options.logger.info(
      '[@eggjs/core/egg_loader] Controller loaded: %s',
      controllerBase
    );
    this.timing.end('Load Controller');
  }
  /** end Controller loader */

  /** start Router loader */
  /**
   * Load app/router.js
   * @function EggLoader#loadRouter
   * @since 1.0.0
   */
  async loadRouter() {
    this.timing.start('Load Router');
    await this.loadFile(path.join(this.options.baseDir, 'app/router'));
    this.timing.end('Load Router');
  }
  /** end Router loader */

  /** start CustomLoader loader */
  async loadCustomLoader() {
    assert(this.config, 'should loadConfig first');
    const customLoader = this.config.customLoader || {};

    for (const property of Object.keys(customLoader)) {
      const loaderConfig = {
        ...customLoader[property],
      };
      assert(
        loaderConfig.directory,
        `directory is required for config.customLoader.${property}`
      );
      let directory: string | string[];
      if (loaderConfig.loadunit === true) {
        directory = this.getLoadUnits().map(unit =>
          path.join(unit.path, loaderConfig.directory)
        );
      } else {
        directory = path.join(this.appInfo.baseDir, loaderConfig.directory);
      }
      const inject = loaderConfig.inject || 'app';
      debug(
        '[loadCustomLoader] loaderConfig: %o, inject: %o, directory: %o',
        loaderConfig,
        inject,
        directory
      );

      switch (inject) {
        case 'ctx': {
          assert(
            !(property in this.app.context),
            `customLoader should not override ctx.${property}`
          );
          const options = {
            caseStyle: CaseStyle.lower,
            fieldClass: `${property}Classes`,
            ...loaderConfig,
            directory,
          };
          await this.loadToContext(directory, property, options);
          break;
        }
        case 'app': {
          assert(
            !(property in this.app),
            `customLoader should not override app.${property}`
          );
          const options = {
            caseStyle: CaseStyle.lower,
            initializer: (Clazz: unknown) => {
              return isClass(Clazz) ? new Clazz(this.app) : Clazz;
            },
            ...loaderConfig,
            directory,
          };
          await this.loadToApp(directory, property, options);
          break;
        }
        default:
          throw new Error('inject only support app or ctx');
      }
    }
  }
  /** end CustomLoader loader */

  // Low Level API

  /**
   * Load single file, will invoke when export is function
   *
   * @param {String} filepath - fullpath
   * @param {Array} inject - pass rest arguments into the function when invoke
   * @returns {Object} exports
   * @example
   * ```js
   * app.loader.loadFile(path.join(app.options.baseDir, 'config/router.js'));
   * ```
   * @since 1.0.0
   */
  async loadFile(filepath: string, ...inject: unknown[]) {
    const fullpath = filepath && this.resolveModule(filepath);
    if (!fullpath) {
      return null;
    }

    // function(arg1, args, ...) {}
    if (inject.length === 0) {
      inject = [this.app];
    }
    let mod = await this.requireFile(fullpath);
    if (typeof mod === 'function' && !isClass(mod)) {
      mod = mod(...inject);
      if (isPromise(mod)) {
        mod = await mod;
      }
    }
    return mod;
  }

  /**
   * @param {String} filepath - fullpath
   * @returns {Object} exports
   * @private
   */
  async requireFile(filepath: string) {
    const timingKey = `Require(${this.#requiredCount++}) ${utils.getResolvedFilename(filepath, this.options.baseDir)}`;
    this.timing.start(timingKey);
    const mod = await utils.loadFile(filepath);
    this.timing.end(timingKey);
    return mod;
  }

  /**
   * Get all loadUnit
   *
   * loadUnit is a directory that can be loaded by EggLoader, it has the same structure.
   * loadUnit has a path and a type(app, framework, plugin).
   *
   * The order of the loadUnits:
   *
   * 1. plugin
   * 2. framework
   * 3. app
   *
   * @returns {Array} loadUnits
   * @since 1.0.0
   */
  getLoadUnits(): EggDirInfo[] {
    if (this.dirs) {
      return this.dirs;
    }

    this.dirs = [];
    if (this.orderPlugins) {
      for (const plugin of this.orderPlugins) {
        this.dirs.push({
          path: plugin.path as string,
          type: 'plugin',
        });
      }
    }

    // framework or egg path
    for (const eggPath of this.eggPaths) {
      this.dirs.push({
        path: eggPath,
        type: 'framework',
      });
    }

    // application
    this.dirs.push({
      path: this.options.baseDir,
      type: 'app',
    });

    debug('Loaded dirs %j', this.dirs);
    return this.dirs;
  }

  /**
   * Load files using {@link FileLoader}, inject to {@link Application}
   * @param {String|Array} directory - see {@link FileLoader}
   * @param {String} property - see {@link FileLoader}
   * @param {Object} options - see {@link FileLoader}
   * @since 1.0.0
   */
  async loadToApp(
    directory: string | string[],
    property: string | symbol,
    options?: Omit<FileLoaderOptions, 'inject' | 'target'>
  ) {
    const target = {};
    Reflect.set(this.app, property, target);
    const loadOptions: FileLoaderOptions = {
      ...options,
      directory: options?.directory ?? directory,
      target,
      inject: this.app,
    };

    const timingKey = `Load "${String(property)}" to Application`;
    this.timing.start(timingKey);
    await new FileLoader(loadOptions).load();
    this.timing.end(timingKey);
  }

  /**
   * Load files using {@link ContextLoader}
   * @param {String|Array} directory - see {@link ContextLoader}
   * @param {String} property - see {@link ContextLoader}
   * @param {Object} options - see {@link ContextLoader}
   * @since 1.0.0
   */
  async loadToContext(
    directory: string | string[],
    property: string | symbol,
    options?: Omit<ContextLoaderOptions, 'inject' | 'property'>
  ) {
    const loadOptions: ContextLoaderOptions = {
      ...options,
      directory: options?.directory || directory,
      property,
      inject: this.app,
    };

    const timingKey = `Load "${String(property)}" to Context`;
    this.timing.start(timingKey);
    await new ContextLoader(loadOptions).load();
    this.timing.end(timingKey);
  }

  /**
   * @member {FileLoader} EggLoader#FileLoader
   * @since 1.0.0
   */
  get FileLoader() {
    return FileLoader;
  }

  /**
   * @member {ContextLoader} EggLoader#ContextLoader
   * @since 1.0.0
   */
  get ContextLoader() {
    return ContextLoader;
  }

  getTypeFiles(filename: string) {
    const files = [`${filename}.default`];
    if (this.serverScope) files.push(`${filename}.${this.serverScope}`);
    if (this.serverEnv === 'default') return files;
    files.push(`${filename}.${this.serverEnv}`);
    if (this.serverScope) {
      files.push(`${filename}.${this.serverScope}_${this.serverEnv}`);
    }
    return files;
  }

  resolveModule(filepath: string) {
    let fullPath;
    try {
      fullPath = utils.resolvePath(filepath);
    } catch {
      // debug('[resolveModule] Module %o resolve error: %s', filepath, err.stack);
      return undefined;
    }
    // if (process.env.EGG_TYPESCRIPT !== 'true' && fullPath.endsWith('.ts')) {
    //   return undefined;
    // }
    return fullPath;
  }
}

function depCompatible(plugin: EggPluginInfo & { dep?: string[] }) {
  if (
    plugin.dep &&
    !(Array.isArray(plugin.dependencies) && plugin.dependencies.length > 0)
  ) {
    plugin.dependencies = plugin.dep;
    delete plugin.dep;
  }
}

function isValidatePackageName(name: string) {
  // only check file path style
  if (name.startsWith('.')) return false;
  if (name.startsWith('/')) return false;
  if (name.includes(':')) return false;
  return true;
}

// support pathMatching on middleware
function wrapMiddleware(
  mw: MiddlewareFunc,
  options: PathMatchingOptions & { enable?: boolean }
): MiddlewareFunc | null {
  // support options.enable
  if (options.enable === false) {
    return null;
  }

  // support options.match and options.ignore
  if (!options.match && !options.ignore) {
    return mw;
  }
  const match = pathMatching(options);

  const fn: MiddlewareFunc = (ctx, next) => {
    if (!match(ctx)) return next();
    return mw(ctx, next);
  };
  fn._name = `${mw._name}middlewareWrapper`;
  return fn;
}

function debugMiddlewareWrapper(mw: MiddlewareFunc): MiddlewareFunc {
  const fn: MiddlewareFunc = async (ctx, next) => {
    const startTime = now();
    debug(
      '[debugMiddlewareWrapper] [%s %s] enter middleware: %s',
      ctx.method,
      ctx.url,
      mw._name
    );
    await mw(ctx, next);
    const rt = diff(startTime);
    debug(
      '[debugMiddlewareWrapper] [%s %s] after middleware: %s [%sms]',
      ctx.method,
      ctx.url,
      mw._name,
      rt
    );
  };
  fn._name = `${mw._name}DebugWrapper`;
  return fn;
}

// wrap the controller class, yield a object with middlewares
function wrapControllerClass(
  Controller: typeof BaseContextClass,
  fullPath: string
) {
  let proto = Controller.prototype;
  const ret: Record<string, any> = {};
  // tracing the prototype chain
  while (proto !== Object.prototype) {
    const keys = Object.getOwnPropertyNames(proto);
    for (const key of keys) {
      // getOwnPropertyNames will return constructor
      // that should be ignored
      if (key === 'constructor') {
        continue;
      }
      // skip getter, setter & non-function properties
      const d = Object.getOwnPropertyDescriptor(proto, key);
      // prevent to override sub method
      if (typeof d?.value === 'function' && !Object.hasOwn(ret, key)) {
        const controllerMethodName = `${Controller.name}.${key}`;
        if (isGeneratorFunction(d.value)) {
          throw new TypeError(
            `Support for generators was removed, controller \`${controllerMethodName}\`, fullpath: ${fullPath}`
          );
        }
        ret[key] = controllerMethodToMiddleware(Controller, key);
        ret[key][FULLPATH] = `${fullPath}#${controllerMethodName}()`;
      }
    }
    proto = Object.getPrototypeOf(proto);
  }
  return ret;
}

function controllerMethodToMiddleware(
  Controller: typeof BaseContextClass,
  key: string
) {
  return function classControllerMiddleware(this: Context, ...args: unknown[]) {
    const controller = new Controller(this);
    if (!this.app.config.controller?.supportParams) {
      args = [this];
    }
    // @ts-expect-error key exists
    return controller[key](...args);
  };
}

// wrap the method of the object, method can receive ctx as it's first argument
function wrapObject(
  obj: Record<string, any>,
  fullPath: string,
  prefix?: string
) {
  const keys = Object.keys(obj);
  const ret: Record<string, any> = {};
  prefix = prefix ?? '';
  for (const key of keys) {
    const controllerMethodName = `${prefix}${key}`;
    const item = obj[key];
    if (isGeneratorFunction(item)) {
      throw new TypeError(
        `Support for generators was removed, controller \`${controllerMethodName}\`, fullpath: ${fullPath}`
      );
    }
    if (typeof item === 'function') {
      const names = getParamNames(item);
      if (names[0] === 'next') {
        throw new Error(
          `controller \`${controllerMethodName}\` should not use next as argument from file ${fullPath}`
        );
      }
      ret[key] = objectFunctionToMiddleware(item);
      ret[key][FULLPATH] = `${fullPath}#${controllerMethodName}()`;
    } else if (isObject(item)) {
      ret[key] = wrapObject(item, fullPath, `${controllerMethodName}.`);
    }
  }
  debug('[wrapObject] fullPath: %s, prefix: %s => %o', fullPath, prefix, ret);
  return ret;
}

function objectFunctionToMiddleware(func: Fun) {
  async function objectControllerMiddleware(this: Context, ...args: unknown[]) {
    if (!this.app.config.controller?.supportParams) {
      args = [this];
    }
    return await func.apply(this, args);
  }
  for (const key in func) {
    Reflect.set(objectControllerMiddleware, key, Reflect.get(func, key));
  }
  return objectControllerMiddleware;
}
