import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { debuglog } from 'node:util';

const debug = debuglog('egg/bundler/scripts/generate-manifest');

async function readOptions() {
  if (process.argv[2]) {
    return JSON.parse(process.argv[2]);
  }

  let raw = '';
  for await (const chunk of process.stdin) {
    raw += chunk;
  }
  return JSON.parse(raw);
}

async function main() {
  debug('argv: %o', process.argv);
  const options = await readOptions();
  debug('generate manifest options: %o', options);

  if (options.env) {
    process.env.EGG_SERVER_ENV = options.env;
  }
  if (options.scope) {
    process.env.EGG_SERVER_SCOPE = options.scope;
  }
  process.env.EGG_MANIFEST = 'true';

  const { ManifestStore } = await import('@eggjs/core');

  let framework;
  if (options.frameworkEntry) {
    framework = await import(options.frameworkEntry);
  } else if (options.framework) {
    const specifier = path.isAbsolute(options.framework) ? pathToFileURL(options.framework).href : options.framework;
    framework = await import(specifier);
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

  await app.close();
}

main().catch((err) => {
  console.error('[bundler-manifest] generation failed:', err);
  process.exit(1);
});
