#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import {
  applyPublishConfigOverrides,
  getCatalogs,
  getPublishablePackages,
  getWorkspaceVersionMap,
  resolveWorkspaceProtocols,
} from './utils.js';

const baseDir = path.join(import.meta.dirname, '..');
const packages = getPublishablePackages(baseDir);
const versionMap = getWorkspaceVersionMap(baseDir);
const catalogs = getCatalogs(baseDir);
const packageDirs = packages.map((pkg) => path.join(baseDir, pkg.directory, pkg.folder));
const originals = new Map();

try {
  // Use the same manifest conversion as npm releases. pnpm pack expects a
  // pnpm installation layout when resolving workspace peers; utoo hoists them.
  for (const packageDir of packageDirs) {
    const manifestPath = path.join(packageDir, 'package.json');
    const original = fs.readFileSync(manifestPath, 'utf8');
    originals.set(manifestPath, original);
    const resolved = resolveWorkspaceProtocols(JSON.parse(original), { versionMap, catalogs });
    const manifest = applyPublishConfigOverrides(resolved);
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }

  // Directory inputs let pkg.pr.new replace internal dependencies with preview
  // URLs. Prebuilt tarballs would retain references to npm releases.
  execFileSync('npx', ['--yes', 'pkg-pr-new@latest', 'publish', '--no-compact', '--no-template', ...packageDirs], {
    cwd: baseDir,
    stdio: 'inherit',
  });
} finally {
  for (const [manifestPath, original] of originals) {
    fs.writeFileSync(manifestPath, original);
  }
}
