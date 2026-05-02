#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import net from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const composeFile = join(rootDir, 'dev-services.compose.yml');
const mysqlPort = Number.parseInt(process.env.EGG_DEV_SERVICES_MYSQL_PORT || '3306', 10);
const redisPort = Number.parseInt(process.env.EGG_DEV_SERVICES_REDIS_PORT || '6379', 10);
const waitTimeout = Number.parseInt(process.env.EGG_DEV_SERVICES_WAIT_TIMEOUT || '90', 10);

const databaseNames = [
  'test',
  'apple',
  'banana',
  'test_runtime_datasource',
  'test_runtime_dao',
  'test_dal_plugin',
  'test_dal_standalone',
  'cnpmcore',
  'cnpmcore_unittest',
];

function dockerCompose(args, options = {}) {
  const result = spawnSync('docker', ['compose', '-f', composeFile, ...args], {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: options.stdio ?? 'pipe',
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0 && !options.allowFailure) {
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    throw new Error(output || `docker compose ${args.join(' ')} failed`);
  }
  return result;
}

function runDocker(args, options = {}) {
  const result = spawnSync('docker', args, {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: options.stdio ?? 'pipe',
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0 && !options.allowFailure) {
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    throw new Error(output || `docker ${args.join(' ')} failed`);
  }
  return result;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function portIsFree(port) {
  return await new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

function runningServices() {
  const result = dockerCompose(['ps', '--status', 'running', '--services'], { allowFailure: true });
  if (result.status !== 0) {
    return new Set();
  }
  return new Set(result.stdout.trim().split(/\s+/).filter(Boolean));
}

function publishedEndpoint(service, containerPort) {
  const result = dockerCompose(['port', service, String(containerPort)], { allowFailure: true });
  if (result.status !== 0) {
    return undefined;
  }
  const line = result.stdout.trim().split(/\r?\n/).filter(Boolean).at(0);
  const match = line?.match(/^(.+):(\d+)$/);
  if (!match) {
    return undefined;
  }
  return {
    host: match[1],
    port: Number.parseInt(match[2], 10),
  };
}

async function assertPortAvailable(service, port, containerPort, running) {
  if (running.has(service)) {
    const published = publishedEndpoint(service, containerPort);
    if (published?.host === '127.0.0.1' && published.port === port) {
      return;
    }

    const current = published ? `${published.host}:${published.port}` : 'an unknown host port';
    throw new Error(
      [
        `${service} is already running for this compose project on ${current}, but this run requested 127.0.0.1:${port}.`,
        'Re-run with the same EGG_DEV_SERVICES_* port override, or run pnpm run dev:services:reset before changing ports.',
      ].join('\n'),
    );
  }
  if (await portIsFree(port)) {
    return;
  }

  throw new Error(
    [
      `Port ${port} is already in use, so the ${service} container was not started.`,
      'If the existing service is compatible, keep using it and run the tests directly.',
      `Otherwise stop that service, or choose another Docker host port with EGG_DEV_SERVICES_${service.toUpperCase()}_PORT.`,
      'Most DAL/ORM/Redis test fixtures still default to 127.0.0.1:3306 or 127.0.0.1:6379, so the default ports are required for the full local test path.',
    ].join('\n'),
  );
}

async function waitFor(command, label) {
  const deadline = Date.now() + waitTimeout * 1000;
  let lastOutput = '';

  while (Date.now() < deadline) {
    const result = dockerCompose(['exec', '-T', ...command], { allowFailure: true });
    lastOutput = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    if (result.status === 0) {
      return;
    }
    await sleep(1000);
  }

  throw new Error(`${label} was not ready within ${waitTimeout}s.\n${lastOutput}`);
}

async function initMysql() {
  await waitFor(['mysql', 'mysqladmin', 'ping', '-h', '127.0.0.1', '-uroot', '--silent'], 'MySQL');

  const sql = databaseNames.map((name) => `CREATE DATABASE IF NOT EXISTS \`${name}\`;`).join(' ');
  dockerCompose(['exec', '-T', 'mysql', 'mysql', '-uroot', '-e', sql], { stdio: 'inherit' });
}

async function waitRedis() {
  await waitFor(['redis', 'redis-cli', 'ping'], 'Redis');
}

async function start() {
  runDocker(['compose', 'version']);

  const running = runningServices();
  await assertPortAvailable('mysql', mysqlPort, 3306, running);
  await assertPortAvailable('redis', redisPort, 6379, running);

  dockerCompose(['up', '-d'], { stdio: 'inherit' });
  await initMysql();
  await waitRedis();

  console.log(`Local services are ready: MySQL 127.0.0.1:${mysqlPort}, Redis 127.0.0.1:${redisPort}`);
}

function stop() {
  dockerCompose(['down'], { stdio: 'inherit' });
}

function reset() {
  dockerCompose(['down', '-v'], { stdio: 'inherit' });
}

function status() {
  dockerCompose(['ps'], { stdio: 'inherit' });
}

async function main() {
  const command = process.argv[2] || 'start';
  switch (command) {
    case 'start':
    case 'up':
      await start();
      break;
    case 'stop':
    case 'down':
      stop();
      break;
    case 'reset':
      reset();
      break;
    case 'status':
    case 'ps':
      status();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Usage: node scripts/dev-services.js <start|stop|status|reset>');
      process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
