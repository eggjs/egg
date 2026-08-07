import { createTeggManifestLoaderFS, TEGG_MANIFEST_KEY } from '@eggjs/tegg-loader';
import type { TeggManifest } from '@eggjs/tegg-types';
import type { Agent, Application } from 'egg';

type TeggLoaderHost = Application | Agent;

/**
 * Restore Tegg's decorated-file view on top of the host LoaderFS.
 *
 * The generic Egg startup manifest owns ordinary FileLoader discoveries, while
 * Tegg stores decorated module files in its manifest extension. App and agent
 * processes install the same overlay during configDidLoad so later consumers
 * only depend on host.loader.loaderFS, regardless of whether it is backed by the
 * real filesystem or a bundle manifest.
 */
export function installTeggLoaderFS(host: TeggLoaderHost): void {
  const manifest = host.loader.manifest.getExtension(TEGG_MANIFEST_KEY) as TeggManifest | undefined;
  if (!manifest) return;

  host.loader.loaderFS = createTeggManifestLoaderFS(host.baseDir, manifest, host.loader.loaderFS);
}
