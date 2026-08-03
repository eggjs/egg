export { Bundler } from './lib/Bundler.ts';
export {
  EntryGenerator,
  type BundleTarget,
  type EntryGeneratorOptions,
  type GeneratedEntries,
  type GeneratedEntry,
} from './lib/EntryGenerator.ts';
export { ExternalsResolver, type ExternalsConfig, type ExternalsResolverOptions } from './lib/ExternalsResolver.ts';
export { ManifestLoader, type ManifestLoaderOptions } from './lib/ManifestLoader.ts';
export {
  renderSnapshotPrelude,
  prependSnapshotPrelude,
  injectExternalRequireLazyHook,
  resolveSnapshotLazyModules,
  SNAPSHOT_PRELUDE_MARKER,
  DEFAULT_SNAPSHOT_LAZY_MODULES,
  type ExternalRequireInjectionResult,
} from './lib/prelude.ts';
export {
  PackRunner,
  type BuildFunc,
  type PackEntry,
  type PackRunnerLoaderItem,
  type PackRunnerModuleConfig,
  type PackRunnerModuleRule,
  type PackRunnerOptions,
  type PackRunnerResult,
  type PackRunnerResolveConfig,
} from './lib/PackRunner.ts';
export {
  StandaloneWorkerBundler,
  type StandaloneWorkerBundlerOptions,
  type StandaloneWorkerBundleResult,
} from './lib/StandaloneWorkerBundler.ts';
export { patchImportMetaInContent } from './lib/importMetaPatch.ts';

import { Bundler } from './lib/Bundler.ts';
import type { BundleTarget } from './lib/EntryGenerator.ts';
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
  /**
   * Emit one self-contained file for every generated entry (all modules inlined,
   * zero sibling-chunk require). This is the default (`true`) and is required for
   * V8 startup snapshots, which forbid user-land require of sibling chunks. Set to
   * `false` to fall back to the legacy multi-chunk standalone output. Enabling
   * {@link BundlerConfig.snapshot} forces this on regardless of an explicit `false`.
   */
  readonly singleFile?: boolean;
}

export interface BundlerRuntimeAssetsConfig {
  /** BaseDir-relative directories scanned for runtime assets. Defaults to `['app']`. */
  readonly roots?: readonly string[];
  /** Relative directories whose files should be copied even when they use source-like extensions. */
  readonly forceCopyDirs?: readonly string[];
}

export interface BundlerConfig {
  /** Application root directory. Required. */
  readonly baseDir: string;
  /** Output directory for the bundled artifact. Required. */
  readonly outputDir: string;
  /** Path to manifest.json. Defaults to `<baseDir>/.egg/manifest.json`. */
  readonly manifestPath?: string;
  /** Framework package specifier. Defaults to `'egg'`; absolute framework paths are not supported by bundle runtime. */
  readonly framework?: string;
  /** Build mode. Defaults to `'production'`. */
  readonly mode?: 'production' | 'development';
  /** Runtime shape. `cluster` emits separate app_worker.js and agent_worker.js entries. Defaults to `single`. */
  readonly target?: BundleTarget;
  /** External package overrides. */
  readonly externals?: BundlerExternalsConfig;
  /** @utoo/pack tuning. */
  readonly pack?: BundlerPackConfig;
  /** Runtime asset copy tuning. */
  readonly runtimeAssets?: BundlerRuntimeAssetsConfig;
  /**
   * Build a V8 startup snapshot-ready artifact. When `true` the bundler emits a
   * self-contained file for every generated entry (implies
   * {@link BundlerPackConfig.singleFile}) and prepends a runtime prelude before each
   * bundle IIFE so it runs before any module loads. Every generated entry also
   * honours the `EGG_BUNDLE_SNAPSHOT` env var at runtime to switch between normal
   * start, snapshot build, and snapshot restore. Defaults to `false`.
   */
  readonly snapshot?: boolean;
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
