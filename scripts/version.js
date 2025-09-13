#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const semver = require('semver');

// Get command line arguments
const args = process.argv.slice(2);
const versionType = args[0];
const isDryRun = args.includes('--dry-run');

if (!['major', 'minor', 'patch'].includes(versionType)) {
  console.error(
    'Usage: node scripts/version.js [major|minor|patch] [--dry-run]'
  );
  process.exit(1);
}

// Check if git working directory is clean
try {
  const status = execSync('git status --porcelain', { encoding: 'utf8' });
  if (status.trim() && !isDryRun) {
    console.error(
      'Git working directory is not clean. Please commit or stash your changes first.'
    );
    process.exit(1);
  }
} catch (error) {
  console.error('Failed to check git status:', error.message);
  process.exit(1);
}

// Get all publishable packages
const packagesDir = path.join(__dirname, '..', 'packages');
const packageFolders = fs
  .readdirSync(packagesDir)
  .filter(folder => fs.statSync(path.join(packagesDir, folder)).isDirectory());

console.log(
  `🚀 ${isDryRun ? '[DRY RUN] ' : ''}Bumping ${versionType} version for all packages...`
);

const updatedVersions = [];

// Backup original package.json files if not dry run
const backups = [];

// Update each package version
packageFolders.forEach(folder => {
  const packageJsonPath = path.join(packagesDir, folder, 'package.json');

  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const originalContent = JSON.stringify(packageJson, null, 2) + '\n';

    if (!isDryRun) {
      backups.push({ path: packageJsonPath, content: originalContent });
    }

    const currentVersion = packageJson.version;
    const newVersion = semver.inc(currentVersion, versionType);

    packageJson.version = newVersion;

    if (!isDryRun) {
      fs.writeFileSync(
        packageJsonPath,
        JSON.stringify(packageJson, null, 2) + '\n'
      );
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
  const rootPackageJson = JSON.parse(
    fs.readFileSync(rootPackageJsonPath, 'utf8')
  );
  const oldRootVersion = rootPackageJson.version;

  if (!isDryRun) {
    backups.push({
      path: rootPackageJsonPath,
      content: JSON.stringify(rootPackageJson, null, 2) + '\n',
    });
    rootPackageJson.version = eggVersion;
    fs.writeFileSync(
      rootPackageJsonPath,
      JSON.stringify(rootPackageJson, null, 2) + '\n'
    );
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

  // Create commit message
  const commitMessage = `chore(release): ${versionType} version bump

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
