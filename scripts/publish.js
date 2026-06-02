#!/usr/bin/env node

/**
 * Resilient per-package publish script.
 *
 * Unlike `utoo -r publish`, this script:
 * - Skips packages that are already published on npm (safe for retries)
 * - Publishes each package individually so one failure doesn't block others
 * - Retries failed packages once
 * - Exits 0 only when all packages are published successfully
 *
 * Usage:
 *   node scripts/publish.js --tag=latest [--provenance] [--dry-run]
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';

import { getPublishablePackages } from './utils.js';

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

console.log(
  `📦 Publishing ${packages.length} packages (tag: ${npmTag}${isDryRun ? ', dry-run' : ''}${useProvenance ? ', provenance' : ''})`,
);

/**
 * Check if a specific version of a package is already published on npm.
 */
function isPublished(name, version) {
  try {
    const result = execFileSync('npm', ['view', `${name}@${version}`, 'version'], {
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
 * Publish a single package by running `utoo publish` from the package
 * directory. utoo's publish only documents --tag/--dry-run/--otp, so we
 * keep the npm-standard --access/--provenance flags (forwarded to npm)
 * and drop pnpm-only flags (--filter, --no-git-checks).
 */
function publishOne(pkg) {
  const publishArgs = ['publish', '--access', 'public', '--tag', npmTag];
  if (useProvenance) publishArgs.push('--provenance');
  if (isDryRun) publishArgs.push('--dry-run');

  execFileSync('utoo', publishArgs, {
    cwd: path.join(baseDir, pkg.directory, pkg.folder),
    stdio: 'inherit',
    env: { ...process.env, NPM_CONFIG_LOGLEVEL: 'verbose' },
    timeout: 120000,
  });
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
