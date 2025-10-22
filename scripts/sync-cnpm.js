#!/usr/bin/env node

import path from 'node:path';

import urllib from 'urllib';

import { getPublishablePackages } from './utils.js';

const baseDir = path.join(import.meta.dirname, '..');
const packages = getPublishablePackages(baseDir).filter((pkg) => !pkg.private);

console.log(`🚀 Syncing to https://npmmirror.com ...`);

for (const pkg of packages) {
  // https://github.com/node-modules/github-actions/blob/master/scripts/npm-release/index.js#L38
  try {
    const { data } = await urllib.request(`https://registry-direct.npmmirror.com/-/package/${pkg.name}/syncs`, {
      method: 'PUT',
      timeout: 30000,
      dataType: 'json',
    });
    const logUrl = `https://registry.npmmirror.com/-/package/${pkg.name}/syncs/${data.id}/log`;
    console.info(`  ✅ ${pkg.name}@${pkg.version} started`);
    console.info(`    - 🔗 Sync: ${logUrl}`);
    console.info(`    - 🔗 Web: https://npmmirror.com/package/${pkg.name}?version=${pkg.version}`);
  } catch (err) {
    console.error(`  ❌ ${pkg.name}@${pkg.version} fail, ${err.message}`);
  }
}
