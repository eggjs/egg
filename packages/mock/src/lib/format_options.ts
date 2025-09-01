import { debuglog } from 'node:util';
import path from 'node:path';
import { mm, isMocked } from 'mm';
import { getFrameworkPath } from '@eggjs/utils';
import { readJSONSync } from 'utility';
import { MockOptions, MockApplicationOptions } from './types.js';
import { getSourceDirname } from './utils.js';

const debug = debuglog('@eggjs/mock/lib/format_options');

/**
 * format the options
 */
export function formatOptions(initOptions?: MockOptions) {
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

  const plugins = options.plugins = options.plugins || {};

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

  // mock HOME as baseDir, but ignore if it has been mocked
  const env = process.env.EGG_SERVER_ENV;
  if (!isMocked(process.env, 'HOME') &&
    (env === 'default' || env === 'test' || env === 'prod')) {
    mm(process.env, 'HOME', options.baseDir);
  }

  // disable cache after call mm.env(),
  // otherwise it will use cache and won't load again.
  if (process.env.EGG_MOCK_SERVER_ENV) {
    options.cache = false;
  }

  debug('format options: %j', options);
  return options;
}

function getPluginName(pkgPath: string): string | undefined {
  try {
    const pkg = readJSONSync(pkgPath);
    if (pkg.eggPlugin?.name) {
      return pkg.eggPlugin.name;
    }
  } catch (_) {
    // ignore
  }
}
