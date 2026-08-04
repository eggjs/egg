import { execFile } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { Worker as ThreadWorker } from 'node:worker_threads';

import type { StartupManifest } from '@eggjs/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { EntryGenerator } from '../src/lib/EntryGenerator.ts';
import type { ManifestLoader } from '../src/lib/ManifestLoader.ts';
import { PackRunner } from '../src/lib/PackRunner.ts';

const execFileAsync = promisify(execFile);

const MANIFEST: StartupManifest = {
  version: 1,
  generatedAt: '2026-01-01T00:00:00.000Z',
  invalidation: {
    lockfileFingerprint: 'cluster-entry-test',
    configFingerprint: 'cluster-entry-test',
    serverEnv: 'prod',
    serverScope: '',
    typescriptEnabled: true,
  },
  extensions: {},
  resolveCache: {},
  fileDiscovery: {},
};

async function writePackage(baseDir: string, name: string, source: string, exports: string | Record<string, string>) {
  const packageDir = path.join(baseDir, 'node_modules', ...name.split('/'));
  await fs.mkdir(packageDir, { recursive: true });
  await fs.writeFile(path.join(packageDir, 'package.json'), JSON.stringify({ name, type: 'module', exports }, null, 2));
  await fs.writeFile(path.join(packageDir, 'index.js'), source);
}

describe('cluster entries — real @utoo/pack build', () => {
  let baseDir: string;

  beforeEach(async () => {
    baseDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'egg-bundler-cluster-entries-')));
    await fs.writeFile(path.join(baseDir, 'package.json'), JSON.stringify({ name: 'cluster-entry-app' }));
    await writePackage(
      baseDir,
      'fake-egg',
      [
        'class Worker {',
        '  constructor(options) { this.options = options; }',
        '  async ready() {}',
        '  async triggerSnapshotWillSerialize() {}',
        '  async triggerSnapshotDidDeserialize() {}',
        '}',
        'export class Application extends Worker {}',
        'export class Agent extends Worker {}',
        'export async function startEgg() {}',
        '',
      ].join('\n'),
      './index.js',
    );
    await writePackage(
      baseDir,
      '@eggjs/core',
      'export class ManifestLoaderFS { constructor(store) { this.store = store; } }\nexport const ManifestStore = { fromBundle: data => data, setBundleStore() {} };\n',
      './index.js',
    );
    await writePackage(
      baseDir,
      '@eggjs/cluster',
      [
        "import { parentPort, threadId } from 'node:worker_threads';",
        "export function createProcessWorkerIO() { return { transport: 'process', send() {} }; }",
        'export function createWorkerThreadIO() {',
        '  return {',
        "    transport: 'worker_threads',",
        '    send(message) { parentPort.postMessage({ ...message, senderWorkerId: String(threadId) }); },',
        '  };',
        '}',
        "export function startAppWorker(_worker, _options, io) { io.send({ action: 'app-start', transport: io.transport }); }",
        "export function startAgentWorker(_worker, io) { io.send({ action: 'agent-start', transport: io.transport }); }",
        '',
      ].join('\n'),
      { './worker_protocol': './index.js' },
    );
  });

  afterEach(async () => {
    await fs.rm(baseDir, { recursive: true, force: true });
  });

  it('emits two independently parseable single-file workers', async () => {
    const entryDir = path.join(baseDir, '.egg-bundle', 'entries');
    const generated = await new EntryGenerator({
      baseDir,
      framework: 'fake-egg',
      manifestLoader: { load: async () => MANIFEST } as unknown as ManifestLoader,
      outputDir: entryDir,
      target: 'cluster',
    }).generate();
    const outputDir = path.join(baseDir, 'dist');

    await new PackRunner({
      entries: generated.entries,
      outputDir,
      externals: {},
      projectPath: entryDir,
      rootPath: baseDir,
      singleFile: true,
    }).run();

    const outputFiles = await fs.readdir(outputDir);
    expect(outputFiles.filter((file) => file.endsWith('.js')).sort()).toEqual(['agent_worker.js', 'app_worker.js']);
    expect(outputFiles).not.toContain('_turbopack__runtime.js');
    for (const filename of ['app_worker.js', 'agent_worker.js']) {
      const filepath = path.join(outputDir, filename);
      const source = await fs.readFile(filepath, 'utf8');
      expect(source).not.toMatch(/_turbopack__runtime/);
      expect(source).not.toMatch(/R\.c\(/);
      await execFileAsync(process.execPath, ['--check', filepath]);
    }

    for (const role of ['app', 'agent'] as const) {
      const filepath = path.join(outputDir, `${role}_worker.js`);
      const masterOptions = JSON.stringify({ baseDir, framework: 'fake-egg', startMode: 'process' });
      await expect(execFileAsync(process.execPath, [filepath, masterOptions])).resolves.toBeDefined();

      const worker = new ThreadWorker(filepath, {
        argv: [JSON.stringify({ baseDir, framework: 'fake-egg', startMode: 'worker_threads' })],
      });
      try {
        const [message] = await once(worker, 'message');
        expect(message).toMatchObject({
          action: `${role}-start`,
          transport: 'worker_threads',
        });
        expect(message.senderWorkerId).toBe(String(worker.threadId));
      } finally {
        await worker.terminate();
      }
    }

    if (Number(process.versions.node.split('.')[0]) >= 24) {
      const workerPath = path.join(outputDir, 'agent_worker.js');
      const blobPath = path.join(outputDir, 'agent.snapshot.blob');
      await execFileAsync(process.execPath, ['--snapshot-blob', blobPath, '--build-snapshot', workerPath], {
        cwd: baseDir,
      });

      const masterOptions = JSON.stringify({ baseDir, framework: 'fake-egg' });
      await expect(
        execFileAsync(process.execPath, ['--snapshot-blob', blobPath, workerPath, masterOptions], { cwd: baseDir }),
      ).resolves.toBeDefined();

      const otherCwd = path.join(baseDir, 'relocated');
      await fs.mkdir(otherCwd);
      await expect(
        execFileAsync(process.execPath, ['--snapshot-blob', blobPath, workerPath, masterOptions], { cwd: otherCwd }),
      ).rejects.toMatchObject({
        code: 1,
        stderr: expect.stringContaining('snapshot working directory mismatch'),
      });
    }
  }, 60_000);
});
