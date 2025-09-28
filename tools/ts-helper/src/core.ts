import chokidar from 'chokidar';
import assert from 'node:assert';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import crypto from 'node:crypto';
import chalk from 'chalk';
import path from 'node:path';
import * as generator from './generator.js';
import { get as deepGet, set as deepSet } from 'dot-prop';
import { declMapping, dtsComment, dtsCommentRE } from './config.js';
import Watcher, { type WatchItem } from './watcher.js';
import { BaseGenerator } from './generators/base.js';
import * as utils from './utils.js';
import { type CompilerOptions } from 'typescript';
import glob from 'globby';
const isInUnitTest = process.env.NODE_ENV === 'test';

declare global {
  interface PlainObject<T = any> {
    [key: string]: T;
  }
}

export interface TsHelperOption {
  cwd?: string;
  framework?: string;
  typings?: string;
  generatorConfig?: { [key: string]: WatchItem | boolean };
  /** @deprecated alias of generatorConfig, has been deprecated */
  watchDirs?: { [key: string]: WatchItem | boolean };
  caseStyle?: string | ((...args: any[]) => string);
  watch?: boolean;
  watchOptions?: chokidar.WatchOptions;
  autoRemoveJs?: boolean;
  throttle?: number;
  execAtInit?: boolean;
  customLoader?: any;
  configFile?: string | string[];
  silent?: boolean;
}

export type TsHelperConfig = typeof defaultConfig & {
  id: string;
  eggInfo: utils.EggInfoResult;
  customLoader: any;
  tsConfig: CompilerOptions;
};

export type TsGenConfig = {
  name: string;
  dir: string;
  dtsDir: string;
  fileList: string[];
  file?: string;
} & WatchItem;

export interface GeneratorResult {
  dist: string;
  content?: string;
}

type GeneratorAllResult = GeneratorResult | GeneratorResult[];
type GeneratorCbResult<T> = T | Promise<T>;

export type TsGenerator<T = GeneratorAllResult | void> = ((
  config: TsGenConfig,
  baseConfig: TsHelperConfig,
  tsHelper: TsHelper,
) => GeneratorCbResult<T>) & { defaultConfig?: WatchItem; };

export const defaultConfig = {
  cwd: utils.convertString(process.env.ETS_CWD, process.cwd()),
  framework: utils.convertString(process.env.ETS_FRAMEWORK, 'egg'),
  typings: utils.convertString(process.env.ETS_TYPINGS, './typings'),
  caseStyle: utils.convertString(process.env.ETS_CASE_STYLE, 'lower'),
  autoRemoveJs: utils.convertString(process.env.ETS_AUTO_REMOVE_JS, true),
  throttle: utils.convertString(process.env.ETS_THROTTLE, 500),
  watch: utils.convertString(process.env.ETS_WATCH, false),
  watchOptions: undefined,
  execAtInit: utils.convertString(process.env.ETS_EXEC_AT_INIT, false),
  silent: utils.convertString(process.env.ETS_SILENT, isInUnitTest),
  generatorConfig: {} as PlainObject<WatchItem>,
  configFile: utils.convertString(process.env.ETS_CONFIG_FILE, '') || [ './tshelper', './tsHelper' ],
};

// default watch dir
export function getDefaultGeneratorConfig(opt?: TsHelperConfig) {
  const baseConfig: { [key: string]: Partial<WatchItem> } = {};

  // extend
  baseConfig.extend = {
    directory: 'app/extend',
    generator: 'extend',
  };

  // controller
  baseConfig.controller = {
    directory: 'app/controller',
    interface: declMapping.controller,
    generator: 'class',
  };

  // middleware
  baseConfig.middleware = {
    directory: 'app/middleware',
    interface: declMapping.middleware,
    generator: 'object',
  };

  // proxy
  baseConfig.proxy = {
    directory: 'app/proxy',
    interface: 'IProxy',
    generator: 'class',
    enabled: false,
  };

  // model
  baseConfig.model = {
    directory: 'app/model',
    generator: 'function',
    interface: 'IModel',
    caseStyle: 'upper',
    enabled: !deepGet(opt?.eggInfo, 'config.customLoader.model'),
  };

  // config
  baseConfig.config = {
    directory: 'config',
    generator: 'config',
    trigger: [ 'add', 'unlink', 'change' ],
  };

  // plugin
  baseConfig.plugin = {
    directory: 'config',
    generator: 'plugin',
    trigger: [ 'add', 'unlink', 'change' ],
  };

  // service
  baseConfig.service = {
    directory: 'app/service',
    interface: declMapping.service,
    generator: 'auto',
  };

  // egg
  baseConfig.egg = {
    directory: 'app',
    generator: 'egg',
    watch: false,
  };

  // custom loader
  baseConfig.customLoader = {
    generator: 'custom',
    trigger: [ 'add', 'unlink', 'change' ],
  };

  return baseConfig as PlainObject;
}

export default class TsHelper extends EventEmitter {
  config: TsHelperConfig;
  watcherList: Watcher[] = [];
  private cacheDist: PlainObject = {};
  private dtsFileList: string[] = [];

  // utils
  public utils = utils;

  constructor(options: TsHelperOption) {
    super();

    // configure ets
    this.configure(options);

    // init watcher
    this.initWatcher();
  }

  // build all watcher
  build() {
    // clean old files
    this.cleanFiles();
    this.watcherList.forEach(watcher => watcher.execute());
    return this;
  }

  // destroy
  destroy() {
    this.removeAllListeners();
    this.watcherList.forEach(item => item.destroy());
    this.watcherList.length = 0;
  }

  // log
  log(info: string, ignoreSilent?: boolean) {
    if (!ignoreSilent && this.config.silent) {
      return;
    }

    utils.log(info);
  }

  warn(info: string) {
    this.log(chalk.yellow(info), !isInUnitTest);
  }

  // create oneForAll file
  createOneForAll(dist?: string) {
    const config = this.config;
    const oneForAllDist = (typeof dist === 'string') ? dist : path.join(config.typings, './ets.d.ts');
    const oneForAllDistDir = path.dirname(oneForAllDist);

    // create d.ts includes all types.
    const distContent = dtsComment + this.dtsFileList
      .map(file => {
        const importUrl = path
          .relative(oneForAllDistDir, file.replace(/\.d\.ts$/, ''))
          .replace(/\/|\\/g, '/');

        return `import '${importUrl.startsWith('.') ? importUrl : `./${importUrl}`}';`;
      })
      .join('\n');

    this.emit('update', oneForAllDist);
    utils.writeFileSync(oneForAllDist, distContent);
  }

  // init watcher
  private initWatcher() {
    Object.keys(this.config.generatorConfig).forEach(key => {
      this.registerWatcher(key, this.config.generatorConfig[key], false);
    });
  }

  // destroy watcher
  destroyWatcher(...refs: string[]) {
    this.watcherList = this.watcherList.filter(w => {
      if (refs.includes(w.ref)) {
        w.destroy();
        return false;
      }
      return true;
    });
  }

  // clean old files in startup
  cleanFiles() {
    const cwd = this.config.typings;
    glob.sync([ '**/*.d.ts', '!**/node_modules' ], { cwd })
      .forEach(file => {
        const fileUrl = path.resolve(cwd, file);
        const content = fs.readFileSync(fileUrl, 'utf-8');
        const isGeneratedByEts = content.match(dtsCommentRE);
        if (isGeneratedByEts) fs.unlinkSync(fileUrl);
      });
  }

  // register watcher
  registerWatcher(name: string, watchConfig: WatchItem & { directory: string | string[]; }, removeDuplicate = true) {
    if (removeDuplicate) {
      this.destroyWatcher(name);
    }

    if (watchConfig.hasOwnProperty('enabled') && !watchConfig.enabled) {
      return;
    }

    const directories = Array.isArray(watchConfig.directory)
      ? watchConfig.directory
      : [ watchConfig.directory ];

    // support array directory.
    return directories.map(dir => {
      const options = {
        name,
        ref: name,
        execAtInit: this.config.execAtInit,
        ...watchConfig,
      };

      if (dir) {
        options.directory = dir;
      }

      if (!this.config.watch) {
        options.watch = false;
      }

      const watcher = new Watcher(this);
      watcher.on('update', this.generateTs.bind(this));
      watcher.init(options);
      this.watcherList.push(watcher);
      return watcher;
    });
  }

  private loadWatcherConfig(config: TsHelperConfig, options: TsHelperOption) {
    const configFile = options.configFile || config.configFile;
    const eggInfo = config.eggInfo;
    const getConfigFromPkg = pkg => (pkg.egg || {}).tsHelper;

    // read from enabled plugins
    if (eggInfo.plugins) {
      Object.keys(eggInfo.plugins)
        .forEach(k => {
          const pluginInfo = eggInfo.plugins![k];
          if (pluginInfo.enable && pluginInfo.path) {
            this.mergeConfig(config, getConfigFromPkg(utils.getPkgInfo(pluginInfo.path)));
          }
        });
    }

    // read from eggPaths
    if (eggInfo.eggPaths) {
      eggInfo.eggPaths.forEach(p => {
        this.mergeConfig(config, getConfigFromPkg(utils.getPkgInfo(p)));
      });
    }

    // read from package.json
    this.mergeConfig(config, getConfigFromPkg(utils.getPkgInfo(config.cwd)));

    // read from local file( default to tshelper | tsHelper )
    (Array.isArray(configFile) ? configFile : [ configFile ]).forEach(f => {
      this.mergeConfig(config, utils.requireFile(path.resolve(config.cwd, f)));
    });

    // merge local config and options to config
    this.mergeConfig(config, options);

    // create extra config
    config.tsConfig = utils.loadTsConfig(path.resolve(config.cwd, './tsconfig.json'));
  }

  // configure
  // options > configFile > package.json
  private configure(options: TsHelperOption) {
    if (options.cwd) {
      options.cwd = path.resolve(defaultConfig.cwd, options.cwd);
    }

    // base config
    const config = { ...defaultConfig } as TsHelperConfig;
    config.id = crypto.randomBytes(16).toString('base64');
    config.cwd = options.cwd || config.cwd;
    config.customLoader = config.customLoader || options.customLoader;

    // load egg info
    config.eggInfo = utils.getEggInfo({
      cwd: config.cwd!,
      cacheIndex: config.id,
      customLoader: config.customLoader,
    });

    config.framework = options.framework || defaultConfig.framework;
    config.generatorConfig = getDefaultGeneratorConfig(config);
    config.typings = path.resolve(config.cwd, config.typings);
    this.config = config;

    // load watcher config
    this.loadWatcherConfig(this.config, options);

    // deprecated framework when env.ETS_FRAMEWORK exists
    if (this.config.framework && this.config.framework !== defaultConfig.framework && process.env.ETS_FRAMEWORK) {
      this.warn(`options.framework are deprecated, using default value(${defaultConfig.framework}) instead`);
    }
  }

  private generateTs(result: GeneratorCbResult<GeneratorAllResult>, file: string | undefined, startTime: number) {
    const updateTs = (result: GeneratorAllResult, file?: string) => {
      const config = this.config;
      const resultList = Array.isArray(result) ? result : [ result ];

      for (const item of resultList) {
        // check cache
        if (this.isCached(item.dist, item.content)) {
          return;
        }

        if (item.content) {
          // create file
          const dtsContent = `${dtsComment}\nimport '${config.framework}';\n${item.content}`;
          utils.writeFileSync(item.dist, dtsContent);
          this.emit('update', item.dist, file);
          this.log(`create ${path.relative(this.config.cwd, item.dist)} (${Date.now() - startTime}ms)`);
          this.updateDistFiles(item.dist);
        } else {
          if (!fs.existsSync(item.dist)) {
            return;
          }

          // remove file
          fs.unlinkSync(item.dist);
          delete this.cacheDist[item.dist];
          this.emit('remove', item.dist, file);
          this.log(`delete ${path.relative(this.config.cwd, item.dist)} (${Date.now() - startTime}ms)`);
          this.updateDistFiles(item.dist, true);
        }
      }
    };

    if (typeof (result as any).then === 'function') {
      return (result as Promise<GeneratorAllResult>)
        .then(r => updateTs(r, file))
        .catch(e => { this.log(e.message); });
    }
    updateTs(result as GeneratorAllResult, file);

  }

  private updateDistFiles(fileUrl: string, isRemove?: boolean) {
    const index = this.dtsFileList.indexOf(fileUrl);
    if (index >= 0) {
      if (isRemove) {
        this.dtsFileList.splice(index, 1);
      }
    } else {
      this.dtsFileList.push(fileUrl);
    }
  }

  private isCached(fileUrl, content) {
    const cacheItem = this.cacheDist[fileUrl];
    if (content && cacheItem === content) {
      // no need to create file content is not changed.
      return true;
    }

    this.cacheDist[fileUrl] = content;
    return false;
  }

  // support dot prop config
  private formatConfig(config) {
    const newConfig: any = {};
    Object.keys(config).forEach(key => deepSet(newConfig, key, config[key]));
    return newConfig;
  }

  // merge ts helper options
  private mergeConfig(base: TsHelperConfig, ...args: Array<TsHelperOption | undefined>) {
    args.forEach(opt => {
      if (!opt) return;

      const config = this.formatConfig(opt);

      // compatitable for alias of generatorCofig
      if (config.watchDirs) config.generatorConfig = config.watchDirs;

      Object.keys(config).forEach(key => {
        if (key !== 'generatorConfig') {
          base[key] = config[key] === undefined ? base[key] : config[key];
          return;
        }

        const generatorConfig = config.generatorConfig || {};
        Object.keys(generatorConfig).forEach(k => {
          const item = generatorConfig[k];
          if (typeof item === 'boolean') {
            if (base.generatorConfig[k]) base.generatorConfig[k].enabled = item;
          } else if (item) {
            // check private generator
            assert(!generator.isPrivateGenerator(item.generator), `${item.generator} is a private generator, can not configure in config file`);

            // compatible for deprecated fields
            [
              [ 'path', 'directory' ],
            ].forEach(([ oldValue, newValue ]) => {
              if (item[oldValue]) {
                item[newValue] = item[oldValue];
              }
            });

            if (base.generatorConfig[k]) {
              Object.assign(base.generatorConfig[k], item);
            } else {
              base.generatorConfig[k] = item;
            }
          }
        });
      });
    });
  }
}

export function createTsHelperInstance(options: TsHelperOption) {
  return new TsHelper(options);
}

export { TsHelper, WatchItem, BaseGenerator, generator };
