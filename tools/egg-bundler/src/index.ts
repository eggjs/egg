export { Bundler } from './lib/Bundler.ts';
export { EntryGenerator, type EntryGeneratorOptions, type GeneratedEntries } from './lib/EntryGenerator.ts';
export { ExternalsResolver, type ExternalsConfig, type ExternalsResolverOptions } from './lib/ExternalsResolver.ts';
export { ManifestLoader, type ManifestLoaderOptions } from './lib/ManifestLoader.ts';
export {
  PackRunner,
  type BuildFunc,
  type PackEntry,
  type PackRunnerOptions,
  type PackRunnerResult,
  type PackRunnerResolveConfig,
} from './lib/PackRunner.ts';

import { Bundler } from './lib/Bundler.ts';
import type { BuildFunc, PackRunnerResolveConfig } from './lib/PackRunner.ts';

export interface BundlerExternalsConfig {
  /** Package names to always mark as external, in addition to auto-detected ones. */
  readonly force?: readonly string[];
  /** Package names to never mark as external (force inline), overriding auto-detection. */
  readonly inline?: readonly string[];
}

export interface BundlerPackConfig {
  /** Injection point for tests (T11) to replace the real @utoo/pack build entry. */
  readonly buildFunc?: BuildFunc;
  /** Override for the monorepo workspace root. Defaults to auto-detection. */
  readonly rootPath?: string;
  /** @utoo/pack resolve tuning supplied by the application. */
  readonly resolve?: PackRunnerResolveConfig;
}

export interface BundlerConfig {
  /** Application root directory. Required. */
  readonly baseDir: string;
  /** Output directory for the bundled artifact. Required. */
  readonly outputDir: string;
  /** Path to manifest.json. Defaults to `<baseDir>/.egg/manifest.json`. */
  readonly manifestPath?: string;
  /** Framework name or absolute path. Defaults to `'egg'`. */
  readonly framework?: string;
  /** Build mode. Defaults to `'production'`. */
  readonly mode?: 'production' | 'development';
  /** External package overrides. */
  readonly externals?: BundlerExternalsConfig;
  /** @utoo/pack tuning. */
  readonly pack?: BundlerPackConfig;
  /** Enable tegg decoratedFile collection. Defaults to `true`. */
  readonly tegg?: boolean;
}

export interface BundleResult {
  /** Absolute path to the output directory. */
  readonly outputDir: string;
  /** All artifact files (absolute paths), sorted. */
  readonly files: readonly string[];
  /** Absolute path to the normalized bundled manifest. */
  readonly manifestPath: string;
}

export async function bundle(config: BundlerConfig): Promise<BundleResult> {
  return new Bundler(config).run();
}
