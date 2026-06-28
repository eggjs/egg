import os from 'node:os';
import path from 'node:path';

import { extractCommandParameters } from './command.js';
import { readJsonIfExists, readTextIfExists } from './fs.js';

export async function collectEnvironment(command) {
  const [packageJson, vitestConfig] = await Promise.all([
    readJsonIfExists(path.resolve(process.cwd(), 'package.json')),
    readVitestConfigDefaults(path.resolve(process.cwd(), 'vitest.config.ts')),
  ]);
  const cpus = os.cpus();
  const availableParallelism = typeof os.availableParallelism === 'function' ? os.availableParallelism() : cpus.length;
  // Effective concurrency ceiling for the threads pool. vitest.config.ts caps
  // maxWorkers on Windows CI; everywhere else the pool defaults to the machine's
  // available parallelism. Mirror that condition so efficiency divides by the number
  // of workers vitest could actually use, not the raw core count.
  const isWindowsCI = Boolean(process.env.CI) && os.platform() === 'win32';
  const workerCeiling =
    isWindowsCI && typeof vitestConfig?.maxWorkers === 'number' ? vitestConfig.maxWorkers : availableParallelism;

  return {
    arch: os.arch(),
    availableParallelism,
    ci: Boolean(process.env.CI),
    commandParameters: extractCommandParameters(command),
    cpuCount: cpus.length,
    cpuModel: cpus[0]?.model ?? 'unknown',
    cwd: process.cwd(),
    env: pickEnv([
      'CI',
      'GITHUB_ACTIONS',
      'GITHUB_EVENT_NAME',
      'GITHUB_REF',
      'GITHUB_RUN_ATTEMPT',
      'GITHUB_RUN_ID',
      'GITHUB_SHA',
      'NODE_ENV',
      'RUNNER_ARCH',
      'RUNNER_NAME',
      'RUNNER_OS',
      'VITEST_MAX_THREADS',
      'VITEST_MIN_THREADS',
      'VITEST_POOL_ID',
    ]),
    loadavg: os.loadavg(),
    node: process.version,
    packageManager: packageJson?.packageManager ?? null,
    platform: os.platform(),
    release: os.release(),
    totalMemoryBytes: os.totalmem(),
    vitestConfig,
    workerCeiling,
  };
}

function pickEnv(names) {
  const values = {};
  for (const name of names) {
    if (process.env[name] !== undefined) {
      values[name] = process.env[name];
    }
  }
  return values;
}

async function readVitestConfigDefaults(configPath) {
  const source = await readTextIfExists(configPath);
  if (!source) {
    return null;
  }
  return {
    coverageProvider: matchStringProperty(source, 'provider'),
    isolate: matchBooleanProperty(source, 'isolate'),
    maxWorkers: matchNumberProperty(source, 'maxWorkers'),
    pool: matchStringProperty(source, 'pool'),
  };
}

function matchNumberProperty(source, property) {
  const match = new RegExp(`^\\s*(?!//|/\\*)${escapeRegExp(property)}:\\s*(\\d+)`, 'm').exec(source);
  return match ? Number(match[1]) : null;
}

function matchStringProperty(source, property) {
  const match = new RegExp(`^\\s*(?!//|/\\*)${escapeRegExp(property)}:\\s*['"]([^'"]+)['"]`, 'm').exec(source);
  return match?.[1] ?? null;
}

function matchBooleanProperty(source, property) {
  const match = new RegExp(`^\\s*(?!//|/\\*)${escapeRegExp(property)}:\\s*(true|false)`, 'm').exec(source);
  if (!match) {
    return null;
  }
  return match[1] === 'true';
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
