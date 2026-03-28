/**
 * Verify that the startup manifest is loaded and used during application boot.
 * Asserts that resolveModule reads from cache with zero extra file I/O.
 *
 * Usage: EGG_SERVER_ENV=<env> node ecosystem-ci/scripts/verify-manifest.mjs
 * Must be run from the application's baseDir (e.g., ecosystem-ci/cnpmcore/).
 */
async function main() {
  const { startEgg } = await import('egg');

  const app = await startEgg({
    baseDir: process.cwd(),
    mode: 'single',
    metadataOnly: true,
  });

  if (!app.loader.manifest) {
    console.error('FAIL: manifest not loaded');
    process.exit(1);
  }

  const { resolveCache, fileDiscovery, tegg } = app.loader.manifest.data;
  console.log('Manifest loaded successfully');
  console.log('  resolveCache entries:', Object.keys(resolveCache).length);
  console.log('  fileDiscovery entries:', Object.keys(fileDiscovery).length);
  console.log('  tegg moduleRefs:', tegg?.moduleReferences?.length ?? 0);

  // After ready(), the loader has run all loading phases with metadataOnly.
  // With a valid manifest, resolveModule should have used the cache
  // and produced zero new collector entries.
  const newEntries = Object.keys(app.loader.resolveCacheCollector).length;
  if (newEntries > 0) {
    console.error('FAIL: resolve produced %d new I/O entries instead of using cache', newEntries);
    process.exit(1);
  }
  console.log('  resolve cache: all hits, zero extra I/O');

  await app.close();
  process.exit(0);
}

void main();
