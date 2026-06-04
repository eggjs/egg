#!/usr/bin/env node
/**
 * Static path-based partitioning of the vitest suite for CI sharding.
 *
 * Vitest's built-in --shard splits files alphabetically, which leaves the
 * heaviest packages (cluster, mock, development, egg, schedule) bunched on a
 * single shard. We instead route each heavy package to its own shard(s) via
 * positional path filters so CI runners parallelize on wall-time-balanced work.
 *
 * `--project` negation is unreliable in vitest 4 (multiple negations behave as
 * a union, re-including what you tried to drop), so we use positional path
 * filters which vitest applies as a reliable file-path substring match.
 *
 * Sizing is tuned against real GitHub `ubuntu-latest` runners (3-5x slower than
 * a local M2), targeting ≤ ~50s per shard's `vitest run` step there. Heavy
 * fork-based packages (cluster/egg/mock/schedule/development) each fork real egg
 * cluster child processes (2-3 OS processes per file); running every file at
 * once oversubscribes the CPU and causes app.ready() timeouts, so they cap file
 * parallelism with --maxWorkers and are further split with vitest --shard. The
 * light `rest-*` shards are fast in-process tests split by interleaving the
 * project dir list.
 *
 * Usage:
 *   node scripts/run-shard.js <shardName> [--coverage] [-- extra vitest args]
 *
 * Run `node scripts/run-shard.js --list` to print all shard names (used by CI
 * to build the matrix).
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

// File parallelism cap for fork-heavy shards (see header).
const HEAVY_MAX_WORKERS = '4';

// Heavy shards: each entry runs a single package dir, optionally sliced with
// vitest --shard=<i/N>. Split counts are sized from observed ubuntu CI timings.
const HEAVY_SHARDS = {
  // cluster ~120s on ubuntu -> 3 slices
  'cluster-1': { dir: 'packages/cluster', shard: '1/3' },
  'cluster-2': { dir: 'packages/cluster', shard: '2/3' },
  'cluster-3': { dir: 'packages/cluster', shard: '3/3' },
  // egg ~95s -> 2 slices
  'egg-1': { dir: 'packages/egg', shard: '1/2' },
  'egg-2': { dir: 'packages/egg', shard: '2/2' },
  // mock ~91s -> 2 slices
  'mock-1': { dir: 'plugins/mock', shard: '1/2' },
  'mock-2': { dir: 'plugins/mock', shard: '2/2' },
  // schedule files each sleep 5-10s; ~86s/half before -> 4 slices total
  'schedule-1': { dir: 'plugins/schedule', shard: '1/4' },
  'schedule-2': { dir: 'plugins/schedule', shard: '2/4' },
  'schedule-3': { dir: 'plugins/schedule', shard: '3/4' },
  'schedule-4': { dir: 'plugins/schedule', shard: '4/4' },
  // development ~49s -> single shard is fine
  development: { dir: 'plugins/development' },
  // Fork-based plugins that dominated rest-* and pushed it >60s on ubuntu.
  // Pull them out of rest into their own (sliceable) shards.
  'security-1': { dir: 'plugins/security', shard: '1/2' },
  'security-2': { dir: 'plugins/security', shard: '2/2' },
  redis: { dir: 'plugins/redis' },
  multipart: { dir: 'plugins/multipart' },
};

const HEAVY_DIRS = new Set(Object.values(HEAVY_SHARDS).map((v) => v.dir));

// `rest` is every remaining project dir, balance-packed into N light shards by
// approximate per-dir cpu weight (seconds; from a full local run). Greedy
// largest-first bin-packing keeps the heaviest leftover dirs (onerror,
// logrotator, watcher, tegg/plugin/tegg) on separate shards so no single shard
// dominates. Unlisted dirs default to a small weight.
const REST_SHARD_COUNT = 8;
const REST_DIR_WEIGHTS = {
  'plugins/watcher': 9.7,
  'packages/core': 7.6,
  'plugins/logrotator': 7.7,
  'plugins/onerror': 7.3,
  'packages/logger': 6.9,
  'tegg/core/dynamic-inject': 6.8,
  'plugins/session': 5.3,
  'plugins/view-nunjucks': 3.2,
  'packages/utils': 2.8,
  'tools/create-egg': 2.7,
  'tegg/standalone/standalone': 2.3,
  'tegg/plugin/controller': 2.1,
  'packages/koa': 2.0,
  'plugins/view': 1.8,
  'tegg/plugin/tegg': 11.2,
};
const REST_DEFAULT_WEIGHT = 0.5;

// The vitest projects globs (see root vitest.config.ts):
//   packages/*, plugins/*, tools/create-egg, tegg/core/*, tegg/plugin/*, tegg/standalone/*
function listProjectDirs() {
  const root = process.cwd();
  const dirs = [];
  const addChildren = (base) => {
    const abs = path.join(root, base);
    if (!existsSync(abs)) return;
    for (const name of readdirSync(abs, { withFileTypes: true })) {
      if (!name.isDirectory()) continue;
      if (name.name === 'node_modules') continue;
      dirs.push(`${base}/${name.name}`);
    }
  };
  addChildren('packages');
  addChildren('plugins');
  addChildren('tegg/core');
  addChildren('tegg/plugin');
  addChildren('tegg/standalone');
  if (existsSync(path.join(root, 'tools/create-egg'))) {
    dirs.push('tools/create-egg');
  }
  return dirs;
}

function restShardNames() {
  return Array.from({ length: REST_SHARD_COUNT }, (_, i) => `rest-${i + 1}`);
}

function allShardNames() {
  return [...Object.keys(HEAVY_SHARDS), ...restShardNames()];
}

const argv = process.argv.slice(2);

if (argv[0] === '--list') {
  // Print one shard name per line (CI reads this to build the matrix).
  console.log(allShardNames().join('\n'));
  process.exit(0);
}

const shardName = argv[0] && !argv[0].startsWith('-') ? argv[0] : 'all';
const passthrough = (argv[0] && !argv[0].startsWith('-') ? argv.slice(1) : argv).filter(Boolean);

const baseArgs = [
  'execute',
  'vitest',
  'run',
  '--bail',
  '1',
  '--retry',
  '2',
  '--testTimeout',
  '20000',
  '--hookTimeout',
  '20000',
];

// Greedy largest-first bin-packing of the rest dirs into REST_SHARD_COUNT bins
// by approximate cpu weight, so the heaviest leftover dirs land on separate
// shards. Deterministic: sort by (weight desc, name) then assign each dir to
// the currently-lightest bin.
function packRestDirs() {
  const dirs = listProjectDirs().filter((d) => !HEAVY_DIRS.has(d));
  dirs.sort((a, b) => {
    const wa = REST_DIR_WEIGHTS[a] ?? REST_DEFAULT_WEIGHT;
    const wb = REST_DIR_WEIGHTS[b] ?? REST_DEFAULT_WEIGHT;
    return wb - wa || (a < b ? -1 : 1);
  });
  const bins = Array.from({ length: REST_SHARD_COUNT }, () => ({ total: 0, dirs: [] }));
  for (const d of dirs) {
    const w = REST_DIR_WEIGHTS[d] ?? REST_DEFAULT_WEIGHT;
    let min = bins[0];
    for (const b of bins) if (b.total < min.total) min = b;
    min.total += w;
    min.dirs.push(d);
  }
  return bins;
}

const restMatch = /^rest-(\d+)$/.exec(shardName);

let targetArgs = [];
if (shardName === 'all') {
  targetArgs = [];
} else if (shardName === 'rest') {
  // Single combined light shard (local fallback).
  targetArgs = listProjectDirs().filter((d) => !HEAVY_DIRS.has(d));
} else if (restMatch) {
  // Weight-balanced bin for this rest shard. No --maxWorkers cap: fast
  // in-process tests benefit from full parallelism.
  const idx = Number(restMatch[1]) - 1;
  if (idx < 0 || idx >= REST_SHARD_COUNT) {
    console.error(`Unknown rest shard: ${shardName} (valid: ${restShardNames().join(', ')})`);
    process.exit(2);
  }
  targetArgs = packRestDirs()[idx].dirs;
} else if (HEAVY_SHARDS[shardName]) {
  const entry = HEAVY_SHARDS[shardName];
  targetArgs = [entry.dir, '--maxWorkers', HEAVY_MAX_WORKERS];
  if (entry.shard) {
    targetArgs.push('--shard', entry.shard);
  }
} else {
  console.error(`Unknown shard: ${shardName}`);
  console.error(`Known shards: ${['all', 'rest', ...allShardNames()].join(', ')}`);
  process.exit(2);
}

const args = [...baseArgs, ...targetArgs, ...passthrough];
console.log('[run-shard] shard=%s args=%j', shardName, args);
const res = spawnSync('ut', args, { stdio: 'inherit' });
process.exit(res.status ?? 1);
