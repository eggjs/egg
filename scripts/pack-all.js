#!/usr/bin/env node

/**
 * Pack every publishable workspace package into the repository root,
 * matching the tgz layout that `ecosystem-ci/patch-project.ts` expects.
 *
 * utoo does not implement `pnpm -r pack`, so we drive `npm pack` per
 * package using the same package discovery the publish script uses.
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';

import { getPublishablePackages } from './utils.js';

const baseDir = path.join(import.meta.dirname, '..');
const packages = getPublishablePackages(baseDir);

console.log(`📦 Packing ${packages.length} package(s) into ${baseDir}`);

for (const pkg of packages) {
  const cwd = path.join(baseDir, pkg.directory, pkg.folder);
  execFileSync('npm', ['pack', '--pack-destination', baseDir], {
    cwd,
    stdio: 'inherit',
    timeout: 120000,
  });
}

console.log('✅ Pack complete');
