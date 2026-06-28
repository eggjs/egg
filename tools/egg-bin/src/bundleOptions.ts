import fs from 'node:fs/promises';
import path from 'node:path';

// Shared bundle-option parsing used by both `egg-bin bundle` and
// `egg-bin snapshot build`, so the two commands cannot drift.

export const bundleModes = ['production', 'development'] as const;
export type BundleMode = (typeof bundleModes)[number];

export function getBundleMode(mode: string): BundleMode {
  if (mode === 'production' || mode === 'development') {
    return mode;
  }
  throw new Error(`Unsupported bundle mode: ${mode}`);
}

export function parsePackAliases(values: readonly string[], baseDir: string): Record<string, string> | undefined {
  if (values.length === 0) return undefined;

  const alias: Record<string, string> = {};
  for (const value of values) {
    const separator = value.indexOf('=');
    if (separator <= 0 || separator === value.length - 1) {
      throw new Error(`Invalid --pack-alias value: ${value}. Expected <specifier>=<target>.`);
    }

    const specifier = value.slice(0, separator);
    const target = value.slice(separator + 1);
    alias[specifier] = target.startsWith('.') ? path.resolve(baseDir, target) : target;
  }

  return alias;
}

export async function getBundleFrameworkSpecifier(baseDir: string, framework?: string): Promise<string> {
  if (framework) return framework;

  const pkgPath = path.join(baseDir, 'package.json');
  const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8')) as {
    egg?: {
      framework?: unknown;
    };
  };
  return typeof pkg.egg?.framework === 'string' && pkg.egg.framework ? pkg.egg.framework : 'egg';
}
