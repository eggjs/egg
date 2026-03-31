const nodeModule = require('node:module');
const path = require('node:path');
const { debuglog } = require('node:util');

const { importModule } = require('@eggjs/utils');

const debug = debuglog('egg/scripts/start-cluster/cjs');

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
      nodeModule.enableCompileCache?.(cacheDir);
    } catch {
      /* non-fatal */
    }
  }

  const exports = await importModule(options.framework);
  let startCluster = exports.startCluster;
  if (typeof startCluster !== 'function') {
    startCluster = exports.default.startCluster;
  }
  await startCluster(options);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
