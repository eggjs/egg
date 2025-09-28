import path from 'node:path';
import chokidar from 'chokidar';
import assert from 'node:assert';
import { EventEmitter } from 'node:events';
import { debuglog } from 'node:util';
import { type TsGenerator, type TsGenConfig, type TsHelperConfig, default as TsHelper } from './core.js';
import * as utils from './utils.js';
import { loadGenerator } from './generator.js';

const debug = debuglog('egg-ts-helper#watcher');

export interface BaseWatchItem {
  ref?: string;
  directory: string;
  generator?: string;
  enabled?: boolean;
  ignore?: string | string[];
  trigger?: Array<'add' | 'unlink' | 'change'>;
  pattern?: string | string[];
  watch?: boolean;
  execAtInit?: boolean;
}

export interface WatchItem extends PlainObject, BaseWatchItem { }

interface WatcherOptions extends WatchItem {
  name: string;
}

export default class Watcher extends EventEmitter {
  ref: string;
  name: string;
  dir: string;
  options: WatcherOptions;
  pattern: string[];
  dtsDir: string;
  config: TsHelperConfig;
  generator: TsGenerator;
  fsWatcher?: chokidar.FSWatcher;
  throttleTick: any = null;
  throttleStack: string[] = [];
  helper: TsHelper;

  constructor(helper: TsHelper) {
    super();
    this.helper = helper;
  }

  public init(options: WatcherOptions) {
    const generatorName = options.generator || 'class';
    this.config = this.helper.config;
    this.name = options.name;
    this.ref = options.ref!;

    const generator = loadGenerator(generatorName, { cwd: this.config.cwd });
    if (utils.isClass(generator)) {
      const instance = new generator(this.config, this.helper);
      this.generator = (config: TsGenConfig) => instance.render(config);
    } else {
      this.generator = generator;
    }

    options = this.options = {
      trigger: [ 'add', 'unlink' ],
      generator: generatorName,
      pattern: '**/*.(ts|js)',
      watch: true,
      ...generator.defaultConfig,
      ...utils.cleanEmpty(options),
    };

    this.pattern = utils.toArray(this.options.pattern)
      .map(utils.formatPath)
      .concat(utils.toArray(this.options.ignore).map(p => `!${utils.formatPath(p)}`));

    assert(options.directory, `options.directory must set in ${generatorName}`);
    this.dir = path.resolve(this.config.cwd, options.directory);
    this.dtsDir = path.resolve(
      this.config.typings,
      path.relative(this.config.cwd, this.dir),
    );

    // watch file change
    if (this.options.watch) {
      this.watch();
    }

    // exec at init
    if (this.options.execAtInit) {
      this.execute();
    }
  }

  public destroy() {
    if (this.fsWatcher) {
      void this.fsWatcher.close();
    }

    clearTimeout(this.throttleTick);
    this.throttleTick = null;
    this.throttleStack.length = 0;
    this.removeAllListeners();
  }

  // watch file change
  public watch() {
    if (this.fsWatcher) {
      void this.fsWatcher.close();
    }

    const watcherOption = {
      cwd: this.dir,
      ignoreInitial: true,
      ...this.config.watchOptions,
    };
    const watcher = chokidar.watch(this.pattern, watcherOption);

    // listen watcher event
    this.options.trigger!.forEach(evt => {
      watcher.on(evt, this.onChange.bind(this));
    });

    // auto remove js while ts was deleted
    if (this.config.autoRemoveJs) {
      watcher.on('unlink', utils.removeSameNameJs);
    }

    this.fsWatcher = watcher;
  }

  // execute generator
  public execute(file?: string): any {
    debug('execution %s', file);
    let _fileList: string[] | undefined;

    // use utils.extend to extend getter
    const newConfig = utils.extend<TsGenConfig>({}, this.options, {
      file,
      dir: this.dir,
      dtsDir: this.dtsDir,
      pattern: this.pattern,
      get fileList() {
        return _fileList || (_fileList = utils.loadFiles(this.dir, this.pattern));
      },
    });

    const startTime = Date.now();
    const result = this.generator(newConfig, this.config, this.helper);
    if (result) {
      this.emit('update', result, file, startTime);
    }

    return result;
  }

  // on file change
  private onChange(filePath: string) {
    filePath = path.resolve(this.dir, filePath);
    debug('file changed %s %o', filePath, this.throttleStack);
    if (!this.throttleStack.includes(filePath)) {
      this.throttleStack.push(filePath);
    }

    if (this.throttleTick) {
      return;
    }

    this.throttleTick = setTimeout(() => {
      while (this.throttleStack.length) {
        this.execute(this.throttleStack.pop()!);
      }

      this.throttleTick = null;
    }, this.config.throttle);
  }
}
