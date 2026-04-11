export { ExternalsResolver, type ExternalsConfig, type ExternalsResolverOptions } from './lib/ExternalsResolver.ts';
export { ManifestLoader, type ManifestLoaderOptions } from './lib/ManifestLoader.ts';
export {
  PackRunner,
  type BuildFunc,
  type PackEntry,
  type PackRunnerOptions,
  type PackRunnerResult,
} from './lib/PackRunner.ts';

export interface BundleOptions {
  readonly projectPath: string;
  readonly outputPath: string;
}

export interface BundleResult {
  readonly outputPath: string;
}

export async function bundle(_options: BundleOptions): Promise<BundleResult> {
  throw new Error('@eggjs/egg-bundler: bundle() is not implemented yet');
}
