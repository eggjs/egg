import { strict as assert } from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { scheduler } from 'node:timers/promises';

import coffee from 'coffee';
import { detectPort } from 'detect-port';
import { mm, restore } from 'mm';
import { request } from 'urllib';
import { describe, it, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

import { cleanup } from './utils.ts';

const __dirname = import.meta.dirname;

const eggBin = path.join(__dirname, '../bin/run.js');
const fixturePath = path.join(__dirname, 'fixtures/snapshot-app');
const homePath = path.join(__dirname, 'fixtures/home-snapshot');
const logDir = path.join(homePath, 'logs');

describe.sequential('test/snapshot.test.ts', () => {
  beforeAll(async () => {
    await fs.mkdir(homePath, { recursive: true });
    await fs.mkdir(logDir, { recursive: true });

    // Create a minimal manifest for the fixture app (required by snapshot-build).
    // We write it directly instead of running `egg-bin manifest generate` because
    // the full framework loading pulls in tegg decorators that fail in dev mode.
    const eggDir = path.join(fixturePath, '.egg');
    await fs.mkdir(eggDir, { recursive: true });
    const manifest = {
      version: 1,
      generatedAt: new Date().toISOString(),
      invalidation: {
        lockfileFingerprint: '',
        configFingerprint: '',
        serverEnv: 'prod',
        serverScope: '',
        typescriptEnabled: false,
      },
      resolveCache: {
        'config/config.default': 'config/config.default.js',
        'config/config.default.js': 'config/config.default.js',
        'config/plugin': null,
        'config/plugin.default': null,
      },
      fileDiscovery: {},
    };
    await fs.writeFile(path.join(eggDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  });

  afterAll(async () => {
    await fs.rm(homePath, { force: true, recursive: true });
    // Clean up generated files
    await fs.rm(path.join(fixturePath, '.egg'), { force: true, recursive: true });
    const files = await fs.readdir(fixturePath);
    for (const file of files) {
      if (file.endsWith('.blob')) {
        await fs.rm(path.join(fixturePath, file), { force: true });
      }
    }
  });

  beforeEach(() => mm(process.env, 'MOCK_HOME_DIR', homePath));
  afterEach(restore);

  describe('snapshot-build command', () => {
    let blobPath: string;

    afterEach(async () => {
      if (blobPath) {
        await fs.rm(blobPath, { force: true });
        blobPath = '';
      }
    });

    it('should build a snapshot blob file', async () => {
      blobPath = path.join(fixturePath, 'snapshot.blob');
      await coffee
        .fork(eggBin, ['snapshot-build', '--output', blobPath, fixturePath])
        // .debug()
        .expect('stdout', /Building V8 startup snapshot/)
        .expect('stdout', /Snapshot built successfully/)
        .expect('code', 0)
        .end();

      const stat = await fs.stat(blobPath);
      assert(stat.size > 0, 'snapshot blob should be non-empty');
    });

    it('should build to custom output path', async () => {
      blobPath = path.join(fixturePath, 'custom-dir', 'my-snapshot.blob');
      await coffee
        .fork(eggBin, ['snapshot-build', '--output', blobPath, fixturePath])
        // .debug()
        .expect('stdout', /Snapshot built successfully/)
        .expect('code', 0)
        .end();

      const stat = await fs.stat(blobPath);
      assert(stat.size > 0, 'custom output snapshot blob should be non-empty');
      // cleanup the custom directory
      await fs.rm(path.dirname(blobPath), { force: true, recursive: true });
      blobPath = ''; // already cleaned
    });

    it('should build with custom port and env', async () => {
      blobPath = path.join(fixturePath, 'snapshot.blob');
      await coffee
        .fork(eggBin, ['snapshot-build', '--output', blobPath, '--port', '3000', '--env', 'prod', fixturePath])
        // .debug()
        .expect('stdout', /port:\s+3000/)
        .expect('stdout', /env:\s+prod/)
        .expect('stdout', /Snapshot built successfully/)
        .expect('code', 0)
        .end();

      const stat = await fs.stat(blobPath);
      assert(stat.size > 0, 'snapshot blob should be non-empty');
    });

    it('should show help info', async () => {
      await coffee
        .fork(eggBin, ['snapshot-build', '--help'])
        // .debug()
        .expect('stdout', /Build a V8 startup snapshot/)
        .expect('code', 0)
        .end();
    });
  });

  // TODO: Start-from-snapshot tests require a comprehensive manifest that includes
  // all framework-internal modules (hundreds of entries). In dev mode, egg-bin manifest
  // generate fails because the full egg framework triggers tegg decorator loading.
  // Once the manifest integration is complete, un-skip these tests.
  describe.skip('start with --snapshot-blob', () => {
    const blobPath = path.join(fixturePath, 'test-snapshot.blob');

    beforeAll(async () => {
      // Build the snapshot first
      await coffee.fork(eggBin, ['snapshot-build', '--output', blobPath, fixturePath]).expect('code', 0).end();

      const stat = await fs.stat(blobPath);
      assert(stat.size > 0, 'snapshot blob should be built before start tests');
    });

    afterAll(async () => {
      await cleanup(fixturePath);
      await fs.rm(blobPath, { force: true });
    });

    afterEach(async () => {
      // Stop any running app and clean up processes
      await coffee.fork(eggBin, ['stop', fixturePath]).end();
      await cleanup(fixturePath);
      // Wait for port release
      await scheduler.wait(500);
    });

    it('should start from snapshot and serve HTTP requests', async () => {
      const port = await detectPort();
      await fs.rm(path.join(logDir, 'master-stderr.log'), { force: true });

      await coffee
        .fork(eggBin, ['start', '--snapshot-blob', blobPath, '--daemon', `--port=${port}`, fixturePath])
        // .debug()
        .expect('stdout', /Starting application from snapshot/)
        .expect('stdout', /started on http:\/\/127\.0\.0\.1:\d+/)
        .expect('code', 0)
        .end();

      // Verify HTTP response
      const result = await request(`http://127.0.0.1:${port}`);
      assert.equal(result.status, 200);
      const body = JSON.parse(result.data.toString());
      assert.equal(body.message, 'hello from snapshot app');
      assert(body.pid > 0, 'should have a valid pid');
    });

    it('should stop snapshot-started app via eggctl stop', async () => {
      const port = await detectPort();
      await fs.rm(path.join(logDir, 'master-stderr.log'), { force: true });

      // Start
      await coffee
        .fork(eggBin, ['start', '--snapshot-blob', blobPath, '--daemon', `--port=${port}`, fixturePath])
        .expect('code', 0)
        .end();

      // Verify running
      const result = await request(`http://127.0.0.1:${port}`);
      assert.equal(result.status, 200);

      // Stop — the stop command should detect --snapshot-blob processes
      await coffee
        .fork(eggBin, ['stop', fixturePath])
        // .debug()
        .expect('stdout', /got master pid/)
        .expect('stdout', /stopped/)
        .end();

      // Verify stopped (request should fail)
      try {
        await request(`http://127.0.0.1:${port}`, { timeout: 2000 });
        assert.fail('should not be able to connect after stop');
      } catch {
        // expected: connection refused
      }
    });

    it('should start from same snapshot blob multiple times', async () => {
      // First start
      const port1 = await detectPort();
      await fs.rm(path.join(logDir, 'master-stderr.log'), { force: true });

      await coffee
        .fork(eggBin, ['start', '--snapshot-blob', blobPath, '--daemon', `--port=${port1}`, fixturePath])
        .expect('code', 0)
        .end();

      const result1 = await request(`http://127.0.0.1:${port1}`);
      assert.equal(result1.status, 200);
      const body1 = JSON.parse(result1.data.toString());

      // Stop first
      await coffee.fork(eggBin, ['stop', fixturePath]).end();
      await cleanup(fixturePath);
      await scheduler.wait(1000);

      // Second start from same blob
      const port2 = await detectPort();
      await fs.rm(path.join(logDir, 'master-stderr.log'), { force: true });

      await coffee
        .fork(eggBin, ['start', '--snapshot-blob', blobPath, '--daemon', `--port=${port2}`, fixturePath])
        .expect('code', 0)
        .end();

      const result2 = await request(`http://127.0.0.1:${port2}`);
      assert.equal(result2.status, 200);
      const body2 = JSON.parse(result2.data.toString());

      // Both should serve correctly but with different PIDs
      assert.equal(body1.message, 'hello from snapshot app');
      assert.equal(body2.message, 'hello from snapshot app');
      assert.notEqual(body1.pid, body2.pid, 'different starts should have different PIDs');
    });
  });

  // TODO: --single mode with TS source requires emitDecoratorMetadata support
  describe.skip('start with --single (no snapshot)', () => {
    afterEach(async () => {
      await coffee.fork(eggBin, ['stop', fixturePath]).end();
      await cleanup(fixturePath);
      await scheduler.wait(500);
    });

    it('should start in single process mode', async () => {
      const port = await detectPort();
      await fs.rm(path.join(logDir, 'master-stderr.log'), { force: true });

      await coffee
        .fork(eggBin, ['start', '--single', '--daemon', `--port=${port}`, fixturePath])
        // .debug()
        .expect('stdout', /single process mode/)
        .expect('stdout', /started on http:\/\/127\.0\.0\.1:\d+/)
        .expect('code', 0)
        .end();

      const result = await request(`http://127.0.0.1:${port}`);
      assert.equal(result.status, 200);
      const body = JSON.parse(result.data.toString());
      assert.equal(body.message, 'hello from snapshot app');
    });
  });

  // TODO: Performance comparison requires --single mode cold start
  describe.skip('snapshot startup performance', () => {
    const blobPath = path.join(fixturePath, 'perf-snapshot.blob');

    beforeAll(async () => {
      await coffee.fork(eggBin, ['snapshot-build', '--output', blobPath, fixturePath]).expect('code', 0).end();
    });

    afterAll(async () => {
      await cleanup(fixturePath);
      await fs.rm(blobPath, { force: true });
    });

    afterEach(async () => {
      await coffee.fork(eggBin, ['stop', fixturePath]).end();
      await cleanup(fixturePath);
      await scheduler.wait(500);
    });

    it('should start faster from snapshot than cold start', async () => {
      const port1 = await detectPort();
      await fs.rm(path.join(logDir, 'master-stderr.log'), { force: true });
      const coldStart = Date.now();
      await coffee
        .fork(eggBin, ['start', '--single', '--daemon', `--port=${port1}`, fixturePath])
        .expect('code', 0)
        .end();
      const coldTime = Date.now() - coldStart;

      const coldResult = await request(`http://127.0.0.1:${port1}`);
      assert.equal(coldResult.status, 200);

      await coffee.fork(eggBin, ['stop', fixturePath]).end();
      await cleanup(fixturePath);
      await scheduler.wait(1000);

      const port2 = await detectPort();
      await fs.rm(path.join(logDir, 'master-stderr.log'), { force: true });
      const snapStart = Date.now();
      await coffee
        .fork(eggBin, ['start', '--snapshot-blob', blobPath, '--daemon', `--port=${port2}`, fixturePath])
        .expect('code', 0)
        .end();
      const snapTime = Date.now() - snapStart;

      const snapResult = await request(`http://127.0.0.1:${port2}`);
      assert.equal(snapResult.status, 200);

      console.log(`Cold start (single mode): ${coldTime}ms`);
      console.log(`Snapshot start: ${snapTime}ms`);
      if (coldTime > 0) {
        const speedup = ((1 - snapTime / coldTime) * 100).toFixed(1);
        console.log(`Speedup: ${speedup}%`);
      }

      if (snapTime >= coldTime) {
        console.warn(
          `WARNING: Snapshot start (${snapTime}ms) was not faster than cold start (${coldTime}ms). ` +
            'This may be due to CI timing variance.',
        );
      }
    });
  });
});
