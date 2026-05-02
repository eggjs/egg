import os from 'node:os';
import path from 'node:path';

import { extractCommandParameters } from './command.js';
import { readJsonIfExists, readTextIfExists } from './fs.js';

export async function collectEnvironment(command) {
  const [packageJson, vitestConfig] = await Promise.all([
    readJsonIfExists(path.resolve(process.cwd(), 'package.json')),
    readVitestConfigDefaults(path.resolve(process.cwd(), 'vitest.config.ts')),
  ]);

  return {
    arch: os.arch(),
    ci: Boolean(process.env.CI),
    commandParameters: extractCommandParameters(command),
    cpuCount: os.cpus().length,
    cpuModel: os.cpus()[0]?.model ?? 'unknown',
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
    pool: matchStringProperty(source, 'pool'),
  };
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
