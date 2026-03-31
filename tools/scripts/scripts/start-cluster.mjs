import module from 'node:module';
import path from 'node:path';
import { debuglog } from 'node:util';

import { importModule } from '@eggjs/utils';

const debug = debuglog('egg/scripts/start-cluster/esm');

async function main() {
  debug('argv: %o', process.argv);
  const options = JSON.parse(process.argv[2]);
  debug('start cluster options: %o', options);

  // Duplicated from ManifestStore.enableCompileCache (@eggjs/core is not a dependency)
  if (!process.env.NODE_COMPILE_CACHE && !process.env.NODE_DISABLE_COMPILE_CACHE) {
    const cacheDir = path.join(options.baseDir ?? process.cwd(), '.egg', 'compile-cache');
    process.env.NODE_COMPILE_CACHE = cacheDir;
    process.env.NODE_COMPILE_CACHE_PORTABLE = '1';
    try {
      module.enableCompileCache?.(cacheDir);
    } catch {
      /* non-fatal */
    }
  }

  const { startCluster } = await importModule(options.framework);
  await startCluster(options);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
