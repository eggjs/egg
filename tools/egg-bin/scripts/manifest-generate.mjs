import { debuglog } from 'node:util';

import { importModule } from '@eggjs/utils';

const debug = debuglog('egg/bin/scripts/manifest-generate');

async function main() {
  debug('argv: %o', process.argv);
  const options = JSON.parse(process.argv[2]);
  debug('manifest generate options: %o', options);

  process.env.EGG_SERVER_ENV = options.env ?? 'prod';

  const egg = await importModule(options.framework || 'egg');
  const { ManifestStore } = await importModule('@eggjs/core');

  // startEgg with metadataOnly: skips lifecycle hooks, only triggers loadMetadata
  const app = await egg.startEgg({
    baseDir: options.baseDir,
    mode: 'single',
    metadataOnly: true,
  });

  const manifest = app.loader.generateManifest(app.loader.teggManifestCollector);
  await ManifestStore.write(options.baseDir, manifest);

  debug(
    'manifest generated, resolveCache: %d, fileDiscovery: %d, tegg: %o',
    Object.keys(manifest.resolveCache).length,
    Object.keys(manifest.fileDiscovery).length,
    manifest.tegg
      ? {
          moduleReferences: manifest.tegg.moduleReferences.length,
          moduleDescriptors: manifest.tegg.moduleDescriptors.length,
        }
      : 'none',
  );

  await app.close();
  process.exit(0);
}

void main();
