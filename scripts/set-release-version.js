#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

import semver from 'semver';

import { getPublishablePackages } from './utils.js';

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const versionArg = args.find((arg) => !arg.startsWith('--'));
const targetVersion = versionArg?.replace(/^v/, '');

if (!targetVersion || !semver.valid(targetVersion)) {
  console.error('Usage: node scripts/set-release-version.js <version|vversion> [--dry-run]');
  console.error('Example: node scripts/set-release-version.js v4.1.2-beta.17');
  process.exit(1);
}

const baseDir = path.join(import.meta.dirname, '..');
const packages = getPublishablePackages(baseDir);
const updates = [];
const validReleaseTypes = ['major', 'minor', 'patch', 'prerelease', 'prepatch', 'preminor', 'premajor'];
const eggPackage = packages.find((pkg) => pkg.name === 'egg');

if (!eggPackage) {
  console.error('Unable to find publishable package "egg".');
  process.exit(1);
}

const currentEggVersion = eggPackage.version;
const targetPrerelease = semver.prerelease(targetVersion);
const prereleaseTag = targetPrerelease?.find((part) => typeof part === 'string');
let releaseType;

if (semver.eq(currentEggVersion, targetVersion)) {
  releaseType = 'none';
} else if (semver.lte(targetVersion, currentEggVersion)) {
  console.error(`Target version ${targetVersion} must be greater than current egg version ${currentEggVersion}.`);
  process.exit(1);
} else {
  releaseType = semver.diff(currentEggVersion, targetVersion);
}

if (!releaseType || (releaseType !== 'none' && !validReleaseTypes.includes(releaseType))) {
  console.error(`Unable to infer a supported release type from ${currentEggVersion} to ${targetVersion}.`);
  process.exit(1);
}

function getNextVersion(currentVersion) {
  if (releaseType === 'none') {
    return currentVersion;
  }

  let nextVersion;
  if (releaseType.includes('pre')) {
    nextVersion = semver.inc(currentVersion, releaseType, prereleaseTag);
  } else {
    nextVersion = semver.inc(currentVersion, releaseType);
  }

  if (!nextVersion) {
    console.error(`Unable to update ${currentVersion} with inferred release type ${releaseType}.`);
    process.exit(1);
  }

  if (releaseType.includes('pre') && targetPrerelease?.length) {
    return setPrerelease(nextVersion, targetPrerelease);
  }

  return nextVersion;
}

if (getNextVersion(currentEggVersion) !== targetVersion) {
  console.error(
    `Inferred release type ${releaseType} cannot update egg from ${currentEggVersion} to ${targetVersion}.`,
  );
  console.error('Use the next stable target, or a prerelease target such as v4.1.2-beta.24.');
  process.exit(1);
}

function setPrerelease(version, prereleaseParts) {
  const parsed = semver.parse(version);
  return `${parsed.major}.${parsed.minor}.${parsed.patch}-${prereleaseParts.join('.')}`;
}

function updateManifest(packageJsonPath, newVersion) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const oldVersion = packageJson.version;

  if (oldVersion === newVersion) {
    updates.push({ name: packageJson.name, oldVersion, changed: false });
    return;
  }

  packageJson.version = newVersion;
  updates.push({ name: packageJson.name, oldVersion, newVersion, changed: true });

  if (!isDryRun) {
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  }
}

for (const { folder, directory, version } of packages) {
  updateManifest(path.join(baseDir, directory, folder, 'package.json'), getNextVersion(version));
}

updateManifest(path.join(baseDir, 'package.json'), targetVersion);

console.log(`${isDryRun ? '[DRY RUN] ' : ''}Set release target version to ${targetVersion}`);
console.log(`  egg: ${currentEggVersion} -> ${targetVersion}`);
console.log(`  release type: ${releaseType}${prereleaseTag ? ` (${prereleaseTag})` : ''}`);
for (const update of updates) {
  const status = update.changed ? `${update.oldVersion} -> ${update.newVersion}` : 'already set';
  console.log(`  ${update.name}: ${status}`);
}

if (isDryRun) {
  console.log('\nDry run complete. No changes were made.');
}
