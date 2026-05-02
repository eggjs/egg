import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const COMMON_ARGS = [
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
  '--reporter=dot',
  '--silent',
  '--passWithNoTests',
];

const STATEFUL_PROJECTS = [
  '@eggjs/cluster',
  '@eggjs/development',
  '@eggjs/logger',
  '@eggjs/logrotator',
  '@eggjs/mock',
  '@eggjs/onerror',
  '@eggjs/orm-plugin',
  '@eggjs/redis',
  '@eggjs/schedule',
  '@eggjs/tegg-plugin',
];

const WORKSPACE_DIRS = ['packages', 'plugins', 'tegg/core', 'tegg/plugin', 'tegg/standalone'];

const HEAVY_REST_LANES = [
  ['packages/core', 'packages/koa', 'tegg/plugin/controller'],
  ['packages/egg', 'packages/errors', 'plugins/security', 'tools/create-egg'],
];

const lanes = [
  {
    name: 'stateful-schedule-cluster',
    args: [...COMMON_ARGS, 'packages/cluster', 'plugins/schedule'],
  },
  {
    name: 'stateful-plugins',
    args: [
      ...COMMON_ARGS,
      'packages/logger',
      'plugins/development',
      'plugins/logrotator',
      'plugins/mock',
      'plugins/onerror',
      'plugins/redis',
      'tegg/plugin/orm',
      'tegg/plugin/tegg',
    ],
  },
];

const restDirs = collectWorkspaceProjects()
  .filter(({ name }) => !STATEFUL_PROJECTS.includes(name))
  .map(({ dir }) => dir);
const assignedRestDirs = new Set(HEAVY_REST_LANES.flat());

HEAVY_REST_LANES.forEach((dirs, index) => {
  lanes.push({
    name: `rest-heavy-${index + 1}`,
    args: [...COMMON_ARGS, ...dirs],
  });
});

const restLaneCount = Number(process.env.CI_TEST_REST_LANES) || 2;
const restLaneDirs = Array.from({ length: restLaneCount }, () => []);

restDirs
  .filter((dir) => !assignedRestDirs.has(dir))
  .forEach((dir, index) => {
    restLaneDirs[index % restLaneCount].push(dir);
  });

restLaneDirs.forEach((dirs, index) => {
  lanes.push({
    name: `rest-${index + 1}-${restLaneCount}`,
    args: [...COMMON_ARGS, ...dirs],
  });
});

const maxWorkers = process.env.CI_TEST_VITEST_WORKERS || '2';

function runLane({ name, args }) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    console.log(`[${name}] start: ut ${args.join(' ')}`);

    const isWindows = process.platform === 'win32';
    const command = 'ut';
    const child = spawn(command, args, {
      env: {
        ...process.env,
        VITEST_MAX_WORKERS: maxWorkers,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      shell: isWindows,
    });

    child.stdout.on('data', (chunk) => {
      process.stdout.write(prefixOutput(name, chunk));
    });
    child.stderr.on('data', (chunk) => {
      process.stderr.write(prefixOutput(name, chunk));
    });
    child.on('error', (error) => {
      console.error(`[${name}] failed to start: ${error.message}`);
      resolve(1);
    });
    child.on('close', (code) => {
      const duration = ((Date.now() - startedAt) / 1000).toFixed(1);
      console.log(`[${name}] exit ${code ?? 1} after ${duration}s`);
      resolve(code ?? 1);
    });
  });
}

function prefixOutput(name, chunk) {
  const text = chunk.toString();
  return text
    .split(/\r?\n/)
    .map((line, index, lines) => {
      if (index === lines.length - 1 && line === '') return '';
      return `[${name}] ${line}\n`;
    })
    .join('');
}

function collectWorkspaceProjects() {
  const dirs = [path.join(process.cwd(), 'tools/create-egg')];

  for (const workspaceDir of WORKSPACE_DIRS) {
    const absoluteDir = path.join(process.cwd(), workspaceDir);
    if (!existsSync(absoluteDir)) continue;

    for (const entry of readdirSync(absoluteDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        dirs.push(path.join(absoluteDir, entry.name));
      }
    }
  }

  return dirs
    .map((dir) => ({
      dir: path.relative(process.cwd(), dir).replaceAll(path.sep, '/'),
      name: readPackageName(dir),
    }))
    .filter((project) => project.name)
    .sort((left, right) => left.name.localeCompare(right.name));
}

function readPackageName(dir) {
  const packageJSONPath = path.join(dir, 'package.json');
  if (!existsSync(packageJSONPath)) return;

  const packageJSON = JSON.parse(readFileSync(packageJSONPath, 'utf8'));
  return packageJSON.name;
}

const results = await Promise.all(lanes.map(runLane));
const failed = results.filter((code) => code !== 0);

if (failed.length > 0) {
  console.error(`${failed.length} Vitest lane(s) failed.`);
  process.exit(1);
}
