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
const packageDirs = getPublishablePackages(baseDir).map(function ({ directory, folder }) {
  return path.join(baseDir, directory, folder);
});
const versionMap = getWorkspaceVersionMap(baseDir);
const catalogs = getCatalogs(baseDir);
const originalManifests = new Map();

try {
  // npm pack needs concrete dependency ranges and published exports.
  for (const packageDir of packageDirs) {
    const manifestPath = path.join(packageDir, 'package.json');
    const originalManifest = fs.readFileSync(manifestPath, 'utf8');
    originalManifests.set(manifestPath, originalManifest);
    const resolvedManifest = resolveWorkspaceProtocols(JSON.parse(originalManifest), { versionMap, catalogs });
    const manifest = applyPublishConfigOverrides(resolvedManifest);
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }

  // Pass directories so pkg.pr.new rewrites internal dependencies to preview URLs.
  execFileSync('npx', ['--yes', 'pkg-pr-new@latest', 'publish', '--no-compact', '--no-template', ...packageDirs], {
    cwd: baseDir,
    stdio: 'inherit',
  });
} finally {
  for (const [manifestPath, originalManifest] of originalManifests) {
    fs.writeFileSync(manifestPath, originalManifest);
  }
}
