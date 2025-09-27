#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import semver from 'semver';

import { getPublishablePackages } from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get command line arguments
const args = process.argv.slice(2);
const versionType = args[0];
const isDryRun = args.includes('--dry-run');

// Get prerelease tag if provided
let prereleaseTag = 'beta'; // default
const prereleaseArg = args.find(arg => arg.startsWith('--prerelease-tag='));
if (prereleaseArg) {
  prereleaseTag = prereleaseArg.split('=')[1];
}

const validVersionTypes = ['major', 'minor', 'patch', 'prerelease', 'prepatch', 'preminor', 'premajor'];
const validPrereleaseTags = ['alpha', 'beta', 'rc'];

if (!validVersionTypes.includes(versionType)) {
  console.error(
    `Usage: node scripts/version.js [${validVersionTypes.join('|')}] [--prerelease-tag=alpha|beta|rc] [--dry-run]`
  );
  process.exit(1);
}

if (versionType.includes('pre') && !validPrereleaseTags.includes(prereleaseTag)) {
  console.error(`Invalid prerelease tag: ${prereleaseTag}. Must be one of: ${validPrereleaseTags.join(', ')}`);
  process.exit(1);
}

// Check if git working directory is clean
try {
  const status = execSync('git status --porcelain', { encoding: 'utf8' });
  if (status.trim() && !isDryRun) {
    console.error('Git working directory is not clean. Please commit or stash your changes first.');
    process.exit(1);
  }
} catch (error) {
  console.error('Failed to check git status:', error.message);
  process.exit(1);
}

const baseDir = path.join(__dirname, '..');
const packageFolders = getPublishablePackages(baseDir);

console.log(`🚀 ${isDryRun ? '[DRY RUN] ' : ''}Bumping ${versionType} version for all packages...`);

const updatedVersions = [];

// Backup original package.json files if not dry run
const backups = [];

// Update each package version
packageFolders.forEach(({ folder, directory }) => {
  const packageJsonPath = path.join(baseDir, directory, folder, 'package.json');

  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const originalContent = JSON.stringify(packageJson, null, 2) + '\n';

    if (!isDryRun) {
      backups.push({ path: packageJsonPath, content: originalContent });
    }

    const currentVersion = packageJson.version;
    let newVersion;

    if (versionType.includes('pre')) {
      // For prerelease versions, pass the prerelease tag
      newVersion = semver.inc(currentVersion, versionType, prereleaseTag);
    } else {
      newVersion = semver.inc(currentVersion, versionType);
    }

    packageJson.version = newVersion;

    if (!isDryRun) {
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    }

    updatedVersions.push({
      name: packageJson.name,
      oldVersion: currentVersion,
      newVersion: newVersion,
    });

    console.log(`  📦 ${packageJson.name}: ${currentVersion} → ${newVersion}`);
  }
});

// Update root package.json version (use egg's version as reference)
const eggVersion = updatedVersions.find(pkg => pkg.name === 'egg')?.newVersion;
if (eggVersion) {
  const rootPackageJsonPath = path.join(__dirname, '..', 'package.json');
  const rootPackageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, 'utf8'));
  const oldRootVersion = rootPackageJson.version;

  if (!isDryRun) {
    backups.push({
      path: rootPackageJsonPath,
      content: JSON.stringify(rootPackageJson, null, 2) + '\n',
    });
    rootPackageJson.version = eggVersion;
    fs.writeFileSync(rootPackageJsonPath, JSON.stringify(rootPackageJson, null, 2) + '\n');
  }

  console.log(`  📦 @eggjs/monorepo: ${oldRootVersion} → ${eggVersion}`);
}

if (isDryRun) {
  console.log('\n✅ Dry run complete! No changes were made.');
  console.log('\nTo apply these changes, run:');
  console.log(`  pnpm run version:${versionType}`);
  process.exit(0);
}

try {
  // Stage all changes
  console.log('\n📝 Staging changes...');
  execSync('git add .', { stdio: 'inherit' });

  // Create commit message with [skip ci] to avoid triggering CI for release commits
  const commitMessage = `chore(release): ${versionType} version bump [skip ci]

${updatedVersions.map(pkg => `- ${pkg.name}@${pkg.newVersion}`).join('\n')}`;

  // Commit changes
  console.log('\n💾 Creating version commit...');
  execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });

  // Create tag using the main egg version
  const tagName = `v${eggVersion}`;
  console.log(`\n🏷️  Creating tag ${tagName}...`);
  execSync(`git tag ${tagName}`, { stdio: 'inherit' });

  console.log('\n✅ Version bump complete!');
  console.log(`\nTo publish, push the changes and tag:`);
  console.log(`  git push origin HEAD --tags`);
  console.log(`\nOr trigger the manual release workflow in GitHub Actions.`);
} catch (error) {
  console.error('\n❌ Error during git operations:', error.message);

  // Restore backup files
  console.log('🔄 Restoring original files...');
  backups.forEach(backup => {
    fs.writeFileSync(backup.path, backup.content);
  });

  process.exit(1);
}
