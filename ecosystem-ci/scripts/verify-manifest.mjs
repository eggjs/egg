#!/usr/bin/env node

/**
 * E2E verification script for the egg-bin manifest CLI.
 *
 * Run this inside a project directory that has egg-bin and egg installed.
 * It tests the full manifest lifecycle:
 *   1. generate — creates .egg/manifest.json via metadataOnly boot
 *   2. validate — verifies the manifest is structurally valid
 *   3. boot with manifest — starts the app using the manifest and health-checks it
 *   4. clean — removes .egg/manifest.json
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const projectDir = process.cwd();
const manifestPath = join(projectDir, '.egg', 'manifest.json');
const env = process.env.MANIFEST_VERIFY_ENV || 'unittest';
const healthPort = process.env.MANIFEST_VERIFY_PORT || '7002';
const healthTimeout = parseInt(process.env.MANIFEST_VERIFY_TIMEOUT || '60', 10);

function run(cmd) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: projectDir });
}

function runCapture(cmd) {
  console.log(`\n$ ${cmd}`);
  return execSync(cmd, { cwd: projectDir, encoding: 'utf-8' });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`PASS: ${message}`);
}

console.log('=== Manifest E2E Verification ===');
console.log('Project: %s', projectDir);
console.log('Env: %s', env);

// Step 1: Clean any pre-existing manifest
if (existsSync(manifestPath)) {
  rmSync(manifestPath);
  console.log('Cleaned pre-existing manifest');
}

// Step 2: Generate manifest
console.log('\n--- Step 1: Generate manifest ---');
run(`npx egg-bin manifest generate --env=${env}`);

// Step 3: Verify manifest file exists and has valid structure
console.log('\n--- Step 2: Verify manifest structure ---');
assert(existsSync(manifestPath), '.egg/manifest.json exists after generate');

const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
assert(manifest.version === 1, 'manifest version is 1');
assert(typeof manifest.generatedAt === 'string' && manifest.generatedAt.length > 0, 'manifest has generatedAt');
assert(typeof manifest.invalidation === 'object', 'manifest has invalidation');
assert(manifest.invalidation.serverEnv === env, `manifest serverEnv matches "${env}"`);
assert(typeof manifest.resolveCache === 'object', 'manifest has resolveCache');
assert(typeof manifest.fileDiscovery === 'object', 'manifest has fileDiscovery');
assert(typeof manifest.extensions === 'object', 'manifest has extensions');

const resolveCacheCount = Object.keys(manifest.resolveCache).length;
const fileDiscoveryCount = Object.keys(manifest.fileDiscovery).length;
console.log('  resolveCache: %d entries', resolveCacheCount);
console.log('  fileDiscovery: %d entries', fileDiscoveryCount);

// Step 4: Validate manifest via CLI
console.log('\n--- Step 3: Validate manifest via CLI ---');
run(`npx egg-bin manifest validate --env=${env}`);

// Step 5: Boot the app with manifest and verify it starts correctly
console.log('\n--- Step 4: Boot app with manifest ---');
try {
  run(`npx eggctl start --port=${healthPort} --env=${env} --daemon`);

  const healthUrl = `http://127.0.0.1:${healthPort}/`;
  const startTime = Date.now();
  let ready = false;

  console.log(`Waiting for app at ${healthUrl} (timeout: ${healthTimeout}s)...`);
  while (true) {
    try {
      const output = runCapture(`curl -s -o /dev/null -w "%{http_code}" "${healthUrl}"`);
      const status = output.trim();
      console.log('  Health check: status=%s', status);
      // Any HTTP response (not connection refused) means the app is up.
      // Not all apps have a route on `/`, so we accept any status code.
      if (status !== '000') {
        ready = true;
        break;
      }
    } catch {
      console.log('  Health check: connection refused, retrying...');
    }

    const elapsed = (Date.now() - startTime) / 1000;
    if (elapsed >= healthTimeout) {
      console.log('  Health check timed out after %ds', elapsed);
      break;
    }

    await sleep(2000);
  }

  run(`npx eggctl stop`);
  assert(ready, 'App booted successfully with manifest');
} catch (err) {
  // Try to stop if started
  try {
    run(`npx eggctl stop`);
  } catch {
    /* ignore */
  }
  console.error('Boot test failed:', err.message);
  process.exit(1);
}

// Step 6: Clean manifest
console.log('\n--- Step 5: Clean manifest ---');
run(`npx egg-bin manifest clean`);
assert(!existsSync(manifestPath), '.egg/manifest.json removed after clean');

console.log('\n=== All manifest E2E checks passed ===');
