const { debuglog } = require('node:util');

const { importModule } = require('@eggjs/utils');

const debug = debuglog('egg/scripts/start-cluster/cjs');

async function main() {
  debug('argv: %o', process.argv);
  const options = JSON.parse(process.argv[2]);
  debug('start cluster options: %o', options);
  const exports = await importModule(options.framework);
  let startCluster = exports.startCluster;
  if (typeof startCluster !== 'function') {
    startCluster = exports.default.startCluster;
  }
  await startCluster(options);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
