#!/usr/bin/env node

import assert from 'node:assert';
import { debuglog } from 'node:util';
import { importModule } from '@eggjs/utils';
import { isAsyncFunction } from 'is-type-of';

const debug = debuglog('@eggjs/mock/lib/start-cluster');

// if (process.env.EGG_BIN_PREREQUIRE) {
//   require('./prerequire');
// }

async function main() {
  const options = JSON.parse(process.argv[2]);
  debug('startCluster with options: %o', options);
  const { startCluster } = await importModule(options.framework);
  assert(isAsyncFunction(startCluster),
    `framework(${options.framework}) should export startCluster as an async function`);
  await startCluster(options);
}

main();
