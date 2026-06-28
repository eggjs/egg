#!/usr/bin/env node

/**
 * Resilient per-package publish script.
 *
 * Publishes with npm so the release keeps npm trusted publishing / provenance
 * via OIDC (`ut publish` supports neither `--access` nor `--provenance`).
 * Because npm does not understand the pnpm/utoo `workspace:` and `catalog:`
 * protocol specifiers, each package manifest is rewritten to concrete version
 * ranges right before publishing and restored afterwards — the same rewrite
 * `pnpm publish` performed for us before the utoo migration.
 *
 * On top of that, unlike a bulk publish this script:
 * - Skips packages that are already published on npm (safe for retries)
 * - Publishes each package individually so one failure doesn't block others
 * - Retries failed packages once
 * - Exits 0 only when all packages are published successfully
 *
 * Usage:
 *   node scripts/publish.js --tag=latest [--provenance] [--dry-run]
 */

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

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const useProvenance = args.includes('--provenance');

let npmTag = 'latest';
const tagArg = args.find((arg) => arg.startsWith('--tag='));
if (tagArg) {
  npmTag = tagArg.split('=')[1];
}

const baseDir = path.join(import.meta.dirname, '..');
const packages = getPublishablePackages(baseDir);
const versionMap = getWorkspaceVersionMap(baseDir);
const catalogs = getCatalogs(baseDir);
const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';

console.log(
  `📦 Publishing ${packages.length} packages (tag: ${npmTag}${isDryRun ? ', dry-run' : ''}${useProvenance ? ', provenance' : ''})`,
);

/**
 * Check if a specific version of a package is already published on npm.
 */
function isPublished(name, version) {
  try {
    const result = execFileSync(npmBin, ['view', `${name}@${version}`, 'version'], {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 15000,
    }).trim();
    return result === version;
  } catch {
    // Could be 404 (not published) or network error.
    // Either way, we should attempt to publish.
    return false;
  }
}

/**
 * Publish a single package with npm from the package directory. The manifest is
 * rewritten in place to resolve `workspace:` / `catalog:` protocol specifiers
 * (npm understands neither) and to hoist `publishConfig` overrides such as
 * `exports`, then restored in a `finally` block so a crash mid-publish can never
 * leave the rewritten manifest on disk. `--access` and `--provenance` are
 * npm-native flags.
 */
function publishOne(pkg) {
  const publishArgs = ['publish', '--access', 'public', '--tag', npmTag];
  if (useProvenance) publishArgs.push('--provenance');
  if (isDryRun) publishArgs.push('--dry-run');

  const packageDir = path.join(baseDir, pkg.directory, pkg.folder);
  const manifestPath = path.join(packageDir, 'package.json');
  const originalManifest = fs.readFileSync(manifestPath, 'utf8');

  try {
    const withVersions = resolveWorkspaceProtocols(JSON.parse(originalManifest), {
      versionMap,
      catalogs,
    });
    const resolved = applyPublishConfigOverrides(withVersions);
    fs.writeFileSync(manifestPath, `${JSON.stringify(resolved, null, 2)}\n`);

    execFileSync(npmBin, publishArgs, {
      cwd: packageDir,
      stdio: 'inherit',
      env: { ...process.env, NPM_CONFIG_LOGLEVEL: 'verbose' },
      timeout: 120000,
    });
  } finally {
    fs.writeFileSync(manifestPath, originalManifest);
  }
}

const published = [];
const skipped = [];
const toRetry = [];

for (const pkg of packages) {
  const label = `${pkg.name}@${pkg.version}`;

  // Skip packages already on npm (safe for retries)
  if (!isDryRun && isPublished(pkg.name, pkg.version)) {
    console.log(`  ⏭️  ${label} already published`);
    skipped.push(label);
    continue;
  }

  try {
    publishOne(pkg);
    console.log(`  ✅ ${label}`);
    published.push(label);
  } catch {
    // Double-check: the publish might have actually succeeded
    // (e.g. npm returned non-zero but the package landed)
    if (!isDryRun && isPublished(pkg.name, pkg.version)) {
      console.log(`  ⏭️  ${label} already published (confirmed after error)`);
      skipped.push(label);
    } else {
      console.error(`  ❌ ${label} failed, will retry`);
      toRetry.push(pkg);
    }
  }
}

// Retry failed packages once
const finalFailed = [];
if (toRetry.length > 0 && !isDryRun) {
  console.log(`\n🔄 Retrying ${toRetry.length} failed package(s)...`);

  for (const pkg of toRetry) {
    const label = `${pkg.name}@${pkg.version}`;

    if (isPublished(pkg.name, pkg.version)) {
      console.log(`  ⏭️  ${label} now published`);
      skipped.push(label);
      continue;
    }

    try {
      publishOne(pkg);
      console.log(`  ✅ ${label} (retry)`);
      published.push(label);
    } catch {
      if (isPublished(pkg.name, pkg.version)) {
        console.log(`  ⏭️  ${label} now published (confirmed after retry error)`);
        skipped.push(label);
      } else {
        console.error(`  ❌ ${label} retry failed`);
        finalFailed.push(label);
      }
    }
  }
}

// Summary
console.log('\n📊 Publish Summary:');
console.log(`  Published: ${published.length}`);
console.log(`  Skipped:   ${skipped.length}`);
console.log(`  Failed:    ${finalFailed.length}`);

if (finalFailed.length > 0) {
  console.error('\n❌ Failed packages:');
  for (const label of finalFailed) {
    console.error(`  - ${label}`);
  }
  process.exit(1);
}

console.log('\n✅ All packages published successfully!');
