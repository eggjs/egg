#!/usr/bin/env node

import assert from 'node:assert';
import { debuglog } from 'node:util';

import { importModule } from '@eggjs/utils';
import { detectPort } from 'detect-port';
import { isAsyncFunction } from 'is-type-of';

const debug = debuglog('egg/mock/lib/start-cluster');

// if (process.env.EGG_BIN_PREREQUIRE) {
//   require('./prerequire');
// }

async function main() {
  const options = JSON.parse(process.argv[2]);
  // Test threads share a PID, so a PID-based counter can allocate the same
  // HTTP port to concurrent clusters. Probe a free port in the child instead.
  // Preserve explicit ports, including zero (use the application's config).
  options.port = options.port ?? (await detectPort());
  debug('startCluster with options: %o', options);
  const { startCluster } = await importModule(options.framework);
  assert(
    isAsyncFunction(startCluster),
    `framework(${options.framework}) should export startCluster as an async function`,
  );
  await startCluster(options);
}

main();
