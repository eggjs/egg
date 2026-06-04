#!/usr/bin/env node
/**
 * Run a per-workspace script across every workspace that defines it, in
 * parallel, without recursing into the monorepo root.
 *
 * `ut run <script> --workspaces` includes the root package, so a root script
 * like `typecheck` that itself calls `ut run typecheck --workspaces` recurses
 * infinitely. This runner enumerates the real workspace directories from the
 * vitest project layout, runs the requested npm script in each that defines it,
 * and bounds wall time by running them concurrently (CPU count) instead of the
 * topological-serial behavior of `ut run --workspaces`.
 *
 * Usage:
 *   node scripts/run-workspaces.js <scriptName>
 */

import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const scriptName = process.argv[2];
if (!scriptName) {
  console.error('usage: node scripts/run-workspaces.js <scriptName>');
  process.exit(2);
}

const ROOT = process.cwd();

function collectWorkspaceDirs() {
  const dirs = [];
  const addChildren = (base) => {
    const abs = path.join(ROOT, base);
    if (!existsSync(abs)) return;
    for (const name of readdirSync(abs, { withFileTypes: true })) {
      if (!name.isDirectory() || name.name === 'node_modules') continue;
      dirs.push(path.join(base, name.name));
    }
  };
  addChildren('packages');
  addChildren('plugins');
  addChildren('tools');
  addChildren('tegg/core');
  addChildren('tegg/plugin');
  addChildren('tegg/standalone');
  return dirs;
}

// Keep only workspaces that actually define the requested script.
const targets = [];
for (const dir of collectWorkspaceDirs()) {
  const pkgPath = path.join(ROOT, dir, 'package.json');
  if (!existsSync(pkgPath)) continue;
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  } catch {
    continue;
  }
  if (pkg.scripts && pkg.scripts[scriptName]) {
    targets.push({ dir, name: pkg.name ?? dir, command: pkg.scripts[scriptName] });
  }
}

if (targets.length === 0) {
  console.log(`[run-workspaces] no workspace defines "${scriptName}", nothing to do`);
  process.exit(0);
}

const concurrency = Math.max(1, os.cpus().length);
console.log(`[run-workspaces] running "${scriptName}" in ${targets.length} workspaces (concurrency ${concurrency})`);

let nextIndex = 0;
let failures = 0;
const failed = [];

function runOne(target) {
  return new Promise((resolve) => {
    // Run the workspace's script body directly with the root-hoisted bin dir on
    // PATH. We bypass `npm run` because npm prepends the workspace's own
    // node_modules/.bin, and some workspaces carry a broken bin shim for a
    // root-only hoisted CLI (e.g. utoo writes a tools/egg-bundler tsgo shim that
    // points at a non-existent local @typescript/native-preview). Resolving the
    // script body against the root bin avoids that stale shim.
    const rootBin = path.join(ROOT, 'node_modules', '.bin');
    const childEnv = {
      ...process.env,
      PATH: `${rootBin}${path.delimiter}${process.env.PATH ?? ''}`,
    };
    const child = spawn(target.command, {
      cwd: path.join(ROOT, target.dir),
      stdio: ['ignore', 'pipe', 'pipe'],
      env: childEnv,
      shell: true,
    });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('close', (code) => {
      if (code !== 0) {
        failures++;
        failed.push(target.name);
        console.error(`\n[run-workspaces] ✗ ${target.name} (exit ${code})\n${out}`);
      }
      resolve();
    });
    child.on('error', (err) => {
      failures++;
      failed.push(target.name);
      console.error(`[run-workspaces] ✗ ${target.name}: ${err.message}`);
      resolve();
    });
  });
}

async function worker() {
  while (nextIndex < targets.length) {
    const target = targets[nextIndex++];
    await runOne(target);
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, () => worker()));

if (failures > 0) {
  console.error(`[run-workspaces] ${failures} workspace(s) failed: ${failed.join(', ')}`);
  process.exit(1);
}
console.log(`[run-workspaces] "${scriptName}" passed in all ${targets.length} workspaces`);
