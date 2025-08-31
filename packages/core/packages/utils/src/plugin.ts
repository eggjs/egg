import { debuglog } from 'node:util';
import path from 'node:path';
import assert from 'node:assert';
import os from 'node:os';
import { stat, mkdir, writeFile, realpath } from 'node:fs/promises';
import { importModule } from './import.js';

const debug = debuglog('@eggjs/utils/plugin');

const tmpDir = os.tmpdir();

function noop() {}

const logger = {
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
};

export interface LoaderOptions {
  framework: string;
  baseDir: string;
  env?: string;
}

export interface Plugin {
  name: string;
  version?: string;
  enable: boolean;
  implicitEnable: boolean;
  path: string;
  dependencies: string[];
  optionalDependencies: string[];
  env: string[];
  from: string;
}

/**
 * @see https://github.com/eggjs/egg-core/blob/2920f6eade07959d25f5c4f96b154d3fbae877db/lib/loader/mixin/plugin.js#L203
 */
export async function getPlugins(options: LoaderOptions) {
  const loader = await getLoader(options);
  await loader.loadPlugin();
  return loader.allPlugins;
}

interface Unit {
  type: 'plugin' | 'framework' | 'app';
  path: string;
}

/**
 * @see https://github.com/eggjs/egg-core/blob/2920f6eade07959d25f5c4f96b154d3fbae877db/lib/loader/egg_loader.js#L348
 */
export async function getLoadUnits(options: LoaderOptions) {
  const loader = await getLoader(options);
  await loader.loadPlugin();
  return loader.getLoadUnits();
}

export async function getConfig(options: LoaderOptions) {
  const loader = await getLoader(options);
  await loader.loadPlugin();
  await loader.loadConfig();
  return loader.config;
}

async function exists(filepath: string) {
  try {
    await stat(filepath);
    return true;
  } catch {
    return false;
  }
}

interface IEggLoader {
  loadPlugin(): Promise<void>;
  loadConfig(): Promise<void>;
  config: Record<string, any>;
  getLoadUnits(): Unit[];
  allPlugins: Record<string, Plugin>;
}

interface IEggLoaderOptions {
  baseDir: string;
  app: unknown;
  logger: object;
  EggCoreClass?: unknown;
}

type EggLoaderImplClass<T = IEggLoader> = new(options: IEggLoaderOptions) => T;

export async function getLoader(options: LoaderOptions) {
  assert(options.framework, 'framework is required');
  assert(await exists(options.framework), `${options.framework} should exist`);
  if (!(options.baseDir && await exists(options.baseDir))) {
    options.baseDir = path.join(tmpDir, 'egg_utils', `${Date.now()}`, 'tmp_app');
    await mkdir(options.baseDir, { recursive: true });
    await writeFile(path.join(options.baseDir, 'package.json'), JSON.stringify({
      name: 'tmp_app',
    }));
    debug('[getLoader] create baseDir: %o', options.baseDir);
  }

  const { EggCore, EggLoader } = await findEggCore(options);
  const mod = await importModule(options.framework);
  const Application = mod.Application ?? mod.default?.Application;
  assert(Application, `Application not export on ${options.framework}`);
  if (options.env) {
    process.env.EGG_SERVER_ENV = options.env;
  }
  return new EggLoader({
    baseDir: options.baseDir,
    logger,
    app: Object.create(Application.prototype),
    EggCoreClass: EggCore,
  });
}

export async function findEggCore(options: LoaderOptions): Promise<{ EggCore?: object; EggLoader: EggLoaderImplClass }> {
  const baseDirRealpath = await realpath(options.baseDir);
  const frameworkRealpath = await realpath(options.framework);
  const paths = [ frameworkRealpath, baseDirRealpath ];
  // custom framework => egg => @eggjs/core
  try {
    const { EggCore, EggLoader } = await importModule('egg', { paths });
    if (EggLoader) {
      return { EggCore, EggLoader };
    }
  } catch (err: any) {
    debug('[findEggCore] import "egg" from paths:%o error: %o', paths, err);
  }

  // egg-core 在 6.2.3 版本中更名为 @eggjs/core，为兼容老版本，支持同时查找两个包，优先使用新名字
  const names = [ '@eggjs/core', 'egg-core' ];
  for (const name of names) {
    try {
      const { EggCore, EggLoader } = await importModule(name, { paths });
      if (EggLoader) {
        return { EggCore, EggLoader };
      }
    } catch (err: any) {
      debug('[findEggCore] import "%s" from paths:%o error: %o', name, paths, err);
    }

    try {
      const { EggCore, EggLoader } = await importModule(name);
      if (EggLoader) {
        return { EggCore, EggLoader };
      }
    } catch (err: any) {
      debug('[findEggCore] import "%s" error: %o', name, err);
    }

    let eggCorePath = path.join(options.baseDir, `node_modules/${name}`);
    if (!(await exists(eggCorePath))) {
      eggCorePath = path.join(options.framework, `node_modules/${name}`);
    }
    if (await exists(eggCorePath)) {
      return await importModule(eggCorePath);
    }
  }

  assert(false, `Can't find ${names.join(' or ')} from ${options.baseDir} and ${options.framework}`);
}
