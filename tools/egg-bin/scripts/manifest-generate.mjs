import { debuglog } from 'node:util';

import { importModule } from '@eggjs/utils';

const debug = debuglog('egg/bin/scripts/manifest-generate');

async function main() {
  debug('argv: %o', process.argv);
  const options = JSON.parse(process.argv[2]);
  debug('manifest generate options: %o', options);

  // Set server env/scope before importing framework
  if (options.env) {
    process.env.EGG_SERVER_ENV = options.env;
  }
  if (options.scope) {
    process.env.EGG_SERVER_SCOPE = options.scope;
  }

  // Clean any existing manifest before generation to ensure the collector
  // captures all lookups (not just cache misses from a stale manifest).
  const { ManifestStore } = await importModule('@eggjs/core', {
    paths: [options.framework],
  });
  ManifestStore.clean(options.baseDir);

  const framework = await importModule(options.framework);
  const app = await framework.start({
    baseDir: options.baseDir,
    framework: options.framework,
    env: options.env,
    metadataOnly: true,
  });

  // Generate manifest from collected metadata
  const manifest = app.loader.generateManifest();

  // Write manifest to .egg/manifest.json
  await ManifestStore.write(options.baseDir, manifest);

  // Log stats
  const resolveCacheCount = Object.keys(manifest.resolveCache).length;
  const fileDiscoveryCount = Object.keys(manifest.fileDiscovery).length;
  const extensionCount = Object.keys(manifest.extensions).length;
  console.log('[manifest] Generated manifest v%d at %s', manifest.version, manifest.generatedAt);
  console.log('[manifest]   resolveCache entries: %d', resolveCacheCount);
  console.log('[manifest]   fileDiscovery entries: %d', fileDiscoveryCount);
  console.log('[manifest]   extension entries: %d', extensionCount);
  console.log('[manifest] Written to %s/.egg/manifest.json', options.baseDir);

  // Clean up and exit
  await app.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('[manifest] Generation failed:', err);
  process.exit(1);
});
