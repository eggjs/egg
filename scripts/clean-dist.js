#!/usr/bin/env node
/**
 * Remove all build output (`dist/`) directories across the monorepo.
 *
 * Replaces the previous `ut run clean --workspaces --if-present`, which failed
 * because most workspaces do not define a `clean` script and the root invocation
 * aborted the `&&` chain in `typecheck` / `pretest`. This script is dependency-
 * free, cross-platform, and never fails on a missing dir.
 *
 * Skips node_modules, test, and fixtures so we only drop real package build
 * output (mirrors the find filter documented in AGENTS.md for `duplicate proto`
 * issues).
 */

import { readdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const SKIP_DIR_NAMES = new Set(['node_modules', 'test', 'fixtures', '.git']);

let removed = 0;

function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const name = entry.name;
    const full = path.join(dir, name);
    if (name === 'dist') {
      try {
        rmSync(full, { recursive: true, force: true });
        removed++;
      } catch {
        /* ignore */
      }
      continue;
    }
    if (SKIP_DIR_NAMES.has(name)) continue;
    walk(full);
  }
}

for (const base of ['packages', 'plugins', 'tools', 'tegg']) {
  const abs = path.join(ROOT, base);
  try {
    statSync(abs);
  } catch {
    continue;
  }
  walk(abs);
}

console.log(`[clean-dist] removed ${removed} dist director${removed === 1 ? 'y' : 'ies'}`);
