import path from 'node:path';
import fs from 'node:fs/promises';
import { getFrameworkPath } from './framework.ts';
import { getPlugins, getConfig, getLoadUnits } from './plugin.ts';
import { getFrameworkOrEggPath } from './deprecated.ts';

// support import { getFrameworkPath } from '@eggjs/utils'
export { getFrameworkPath } from './framework.ts';
export {
  getPlugins,
  getConfig,
  getLoadUnits,
  getLoader,
  findEggCore,
} from './plugin.ts';
export { getFrameworkOrEggPath } from './deprecated.ts';
export * from './import.ts';
export * from './error/index.ts';

// support import utils from '@eggjs/utils'
export default {
  getFrameworkPath,
  getPlugins,
  getConfig,
  getLoadUnits,
  getFrameworkOrEggPath,
};

// FIXME: better enum
export const EggType = {
  framework: 'framework',
  plugin: 'plugin',
  application: 'application',
  unknown: 'unknown',
} as const;

/**
 * Detect the type of egg project
 */
export async function detectType(
  baseDir: string
): Promise<keyof typeof EggType> {
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
