import path from 'node:path';
import fs from 'node:fs/promises';
import { getFrameworkPath } from './framework.js';
import { getPlugins, getConfig, getLoadUnits } from './plugin.js';
import { getFrameworkOrEggPath } from './deprecated.js';

// support import { getFrameworkPath } from '@eggjs/utils'
export { getFrameworkPath } from './framework.js';
export { getPlugins, getConfig, getLoadUnits, getLoader, findEggCore } from './plugin.js';
export { getFrameworkOrEggPath } from './deprecated.js';
export * from './import.js';
export * from './error/index.js';

// support import utils from '@eggjs/utils'
export default {
  getFrameworkPath,
  getPlugins, getConfig, getLoadUnits,
  getFrameworkOrEggPath,
};

export enum EggType {
  framework = 'framework',
  plugin = 'plugin',
  application = 'application',
  unknown = 'unknown',
}

/**
 * Detect the type of egg project
 */
export async function detectType(baseDir: string): Promise<EggType> {
  const pkgFile = path.join(baseDir, 'package.json');
  let pkg: {
    egg?: {
      framework?: boolean;
    };
    eggPlugin?: {
      name: string;
    };
  };
  try {
    await fs.access(pkgFile);
  } catch {
    return EggType.unknown;
  }
  try {
    pkg = JSON.parse(await fs.readFile(pkgFile, 'utf-8'));
  } catch {
    return EggType.unknown;
  }
  if (pkg.egg?.framework) {
    return EggType.framework;
  }
  if (pkg.eggPlugin?.name) {
    return EggType.plugin;
  }
  return EggType.application;
}
