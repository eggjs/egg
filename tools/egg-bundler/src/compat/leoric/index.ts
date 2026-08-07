import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { PackRunnerModuleConfig } from '../../lib/PackRunner.ts';

const PACKAGE_NAME = 'leoric';
const RUNTIME_REQUIRE_LOADER = fileURLToPath(new URL('./runtime-require-loader.cjs', import.meta.url));
const SOURCE_CONDITION =
  /[\\/]leoric[\\/]lib[\\/](?:drivers[\\/](?:mysql[\\/]index|sqlite[\\/]pool|postgres[\\/](?:index|type_parser)|sqljs[\\/]sqljs-connection)|realm[\\/]index|migrations)\.js$/;

export interface LeoricSnapshotCompatibility {
  readonly inlinePackages: readonly string[];
  readonly module: PackRunnerModuleConfig;
}

export interface ResolveLeoricSnapshotCompatibilityOptions {
  readonly baseDir: string;
  readonly lazyModules: readonly string[];
  readonly forcedExternals?: readonly string[];
}

function isResolvable(baseDir: string): boolean {
  const req = createRequire(path.join(baseDir, 'package.json'));
  try {
    req.resolve(PACKAGE_NAME);
    return true;
  } catch {
    return false;
  }
}

export function resolveLeoricSnapshotCompatibility(
  options: ResolveLeoricSnapshotCompatibilityOptions,
): LeoricSnapshotCompatibility | undefined {
  if (!isResolvable(options.baseDir)) return undefined;

  if (options.lazyModules.includes(PACKAGE_NAME)) {
    throw new Error(
      '[@eggjs/egg-bundler] leoric must be bundled in snapshot mode; remove it from egg.snapshot.lazyModules',
    );
  }
  if (options.forcedExternals?.includes(PACKAGE_NAME)) {
    throw new Error('[@eggjs/egg-bundler] leoric must be bundled in snapshot mode; remove it from externals.force');
  }

  return {
    inlinePackages: [PACKAGE_NAME],
    module: {
      rules: {
        '*.js': {
          condition: { path: SOURCE_CONDITION },
          loaders: [{ loader: RUNTIME_REQUIRE_LOADER }],
        },
      },
    },
  };
}
