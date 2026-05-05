import path from 'node:path';
import { debuglog } from 'node:util';

import { getFrameworkPath } from '@eggjs/utils';
import { mm, isMocked } from 'mm';
import { readJSONSync } from 'utility';

import type { MockOptions, MockApplicationOptions } from './types.ts';
import { getSourceDirname } from './utils.ts';

const debug = debuglog('egg/mock/lib/format_options');
const MOCK_HOME_ENVS = new Set(['default', 'test', 'prod']);

export function shouldMockProcessHome(): boolean {
  return MOCK_HOME_ENVS.has(process.env.EGG_SERVER_ENV ?? '') || process.env.NODE_ENV === 'test';
}

export function mockProcessHome(baseDir: string): void {
  if (!shouldMockProcessHome()) {
    return;
  }
  if (!isMocked(process.env, 'HOME')) {
    mm(process.env, 'HOME', baseDir);
  }
  if (!isMocked(process.env, 'EGG_HOME') && process.env.EGG_HOME === undefined) {
    mm(process.env, 'EGG_HOME', baseDir);
  }
}

/**
 * format the options
 */
export function formatOptions(initOptions?: MockOptions): MockApplicationOptions {
  const options = {
    baseDir: process.cwd(),
    cache: true,
    coverage: true,
    clean: true,
    ...initOptions,
  } as MockApplicationOptions;

  // relative path to test/fixtures
  // ```js
  // formatOptions({ baseDir: 'app' }); // baseDir => $PWD/test/fixtures/app
  // ```
  if (!path.isAbsolute(options.baseDir)) {
    options.baseDir = path.join(process.cwd(), 'test/fixtures', options.baseDir);
  }

  let framework = initOptions?.framework ?? initOptions?.customEgg;
  // test for framework
  if (framework === true) {
    framework = process.cwd();
    // disable plugin test when framework test
    options.plugin = false;
  } else {
    if (!framework) {
      framework = '';
    }
    // it will throw when framework is not found
    framework = getFrameworkPath({ framework, baseDir: options.baseDir });
  }
  options.framework = options.customEgg = framework;

  const plugins = (options.plugins = options.plugins || {});

  // add self as a plugin
  let pluginPath = path.join(getSourceDirname(), '..');
  // for dist directory
  // convert `/eggjs/mock/dist` to `/eggjs/mock`
  if (pluginPath.endsWith('/dist') || pluginPath.endsWith('\\dist')) {
    pluginPath = path.join(pluginPath, '..');
  }
  plugins['egg-mock'] = {
    enable: true,
    path: pluginPath,
  };

  // test for plugin
  if (options.plugin !== false) {
    // add self to plugin list
    const pluginPath = process.cwd();
    const pkgPath = path.join(pluginPath, 'package.json');
    const pluginName = getPluginName(pkgPath);
    if (options.plugin && !pluginName) {
      throw new Error(`should set "eggPlugin" property in ${pkgPath}`);
    }
    if (pluginName) {
      plugins[pluginName] = {
        enable: true,
        path: pluginPath,
      };
    }
  }

  // mock HOME/EGG_HOME as baseDir for test-like envs, but ignore explicit mocks.
  mockProcessHome(options.baseDir);

  // disable cache after call mm.env(),
  // otherwise it will use cache and won't load again.
  if (process.env.EGG_MOCK_SERVER_ENV) {
    options.cache = false;
  }

  // when running under vitest threads pool, use worker_threads start mode
  // so egg cluster-client uses thread-based IPC instead of process-based
  if (!options.startMode && process.env.EGG_VITEST_POOL === 'threads') {
    options.startMode = 'worker_threads';
  }

  debug('[formatOptions] options: %j', options);
  return options;
}

function getPluginName(pkgPath: string): string | undefined {
  try {
    const pkg = readJSONSync(pkgPath);
    if (pkg.eggPlugin?.name) {
      return pkg.eggPlugin.name;
    }
  } catch {
    // ignore
  }
}
