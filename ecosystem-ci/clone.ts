import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import repos from './repo.json' with { type: 'json' };

const cwd = import.meta.dirname;

function exec(cmd: string, execCwd: string = cwd): string {
  return execSync(cmd, { cwd: execCwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function getRemoteUrl(dir: string): string | null {
  try {
    return exec('git remote get-url origin', dir);
  } catch {
    return null;
  }
}

function normalizeGitUrl(url: string): string {
  // Convert git@github.com:owner/repo.git to github.com/owner/repo
  // Convert https://github.com/owner/repo.git to github.com/owner/repo
  return url
    .replace(/^git@([^:]+):/, '$1/')
    .replace(/^https?:\/\//, '')
    .replace(/\.git$/, '');
}

function isSameRepo(url1: string, url2: string): boolean {
  return normalizeGitUrl(url1) === normalizeGitUrl(url2);
}

function getCurrentHash(dir: string): string | null {
  try {
    return exec('git rev-parse HEAD', dir);
  } catch {
    return null;
  }
}

function cloneRepo(repoUrl: string, branch: string, targetDir: string): void {
  console.info(`Cloning ${repoUrl} (branch: ${branch})...`);
  exec(`git clone --branch ${branch} ${repoUrl} ${targetDir}`);
}

function checkoutHash(dir: string, hash: string): void {
  console.info(`Checking out ${hash}...`);
  exec(`git fetch origin`, dir);
  exec(`git checkout ${hash}`, dir);
}

for (const [repoName, repo] of Object.entries(repos)) {
  const targetDir = join(cwd, repoName);

  if (existsSync(targetDir)) {
    console.info(`\nDirectory ${repoName} exists, validating...`);

    const remoteUrl = getRemoteUrl(targetDir);
    if (!remoteUrl) {
      console.error(`  ✗ ${repoName} is not a git repository`);
      continue;
    }

    if (!isSameRepo(remoteUrl, repo.repository)) {
      console.error(`  ✗ Remote mismatch: expected ${repo.repository}, got ${remoteUrl}`);
      continue;
    }

    console.info(`  ✓ Remote matches`);

    const currentHash = getCurrentHash(targetDir);
    if (currentHash === repo.hash) {
      console.info(`  ✓ Already at correct commit ${repo.hash.slice(0, 7)}`);
    } else {
      console.info(`  → Current: ${currentHash?.slice(0, 7)}, expected: ${repo.hash.slice(0, 7)}`);
      checkoutHash(targetDir, repo.hash);
      console.info(`  ✓ Checked out ${repo.hash.slice(0, 7)}`);
    }
  } else {
    cloneRepo(repo.repository, repo.branch, targetDir);
    checkoutHash(targetDir, repo.hash);
    console.info(`✓ Cloned and checked out ${repo.hash.slice(0, 7)}`);
  }
}

console.info('\nDone!');
