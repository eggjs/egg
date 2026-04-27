import { debuglog } from 'node:util';

const debug = debuglog('egg/bundler/scripts/generate-manifest');

async function flushWritable(stream) {
  if (!stream.writable || stream.destroyed) return;
  await new Promise((resolve) => stream.write('', resolve));
}

async function exitAfterManifestWrite() {
  await Promise.all([flushWritable(process.stdout), flushWritable(process.stderr)]);
  process.exit(0);
}

async function main() {
  debug('argv: %o', process.argv);
  const options = JSON.parse(process.argv[2]);
  debug('generate manifest options: %o', options);

  if (options.env) {
    process.env.EGG_SERVER_ENV = options.env;
  }
  if (options.scope) {
    process.env.EGG_SERVER_SCOPE = options.scope;
  }
  process.env.EGG_MANIFEST = 'true';

  const { ManifestStore } = await import('@eggjs/core');
  ManifestStore.clean(options.baseDir);

  // `frameworkEntry` (a file:// URL to the package's real entry file) is the
  // only way to load a workspace-linked framework whose `exports` map points at
  // a TypeScript source. Importing the package directory directly would bypass
  // `exports` and fall through to legacy directory resolution.
  let framework;
  if (options.frameworkEntry) {
    framework = await import(options.frameworkEntry);
  } else if (options.framework) {
    framework = await import(options.framework);
  } else {
    framework = await import('egg');
  }

  const app = await framework.start({
    baseDir: options.baseDir,
    framework: options.framework,
    env: options.env,
    mode: 'single',
  });

  const manifest = app.loader.generateManifest();
  await ManifestStore.write(options.baseDir, manifest);

  const resolveCacheCount = Object.keys(manifest.resolveCache).length;
  const fileDiscoveryCount = Object.keys(manifest.fileDiscovery).length;
  const extensionCount = Object.keys(manifest.extensions).length;
  console.log('[bundler-manifest] generated v%d at %s', manifest.version, manifest.generatedAt);
  console.log('[bundler-manifest]   resolveCache: %d', resolveCacheCount);
  console.log('[bundler-manifest]   fileDiscovery: %d', fileDiscoveryCount);
  console.log('[bundler-manifest]   extensions: %d', extensionCount);

  // This helper runs in a dedicated subprocess. Closing the real app would
  // trigger user beforeClose hooks that may depend on services intentionally
  // unavailable during bundle metadata collection, so exit after the manifest
  // is written and stdio has been flushed.
  await exitAfterManifestWrite();
}

main().catch((err) => {
  console.error('[bundler-manifest] generation failed:', err);
  process.exit(1);
});
