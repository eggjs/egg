import { strict as assert } from 'node:assert';
import { once } from 'node:events';
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import net, { type AddressInfo } from 'node:net';
import path from 'node:path';

import { detectPort } from 'detect-port';
import { afterEach, describe, it } from 'vitest';

import mm, { type MockClusterApplication, type MockClusterOptions } from '../src/index.ts';
import { getFixtures } from './helper.ts';

describe('test/cluster-port.test.ts', () => {
  const apps: MockClusterApplication[] = [];
  const baseDirs: string[] = [];
  let occupied: net.Server | undefined;

  afterEach(async () => {
    try {
      await Promise.all(apps.splice(0).map((app) => app.close()));
    } finally {
      try {
        if (occupied) {
          await new Promise<void>((resolve, reject) => occupied!.close((err) => (err ? reject(err) : resolve())));
        }
      } finally {
        occupied = undefined;
        await mm.restore();
        for (const baseDir of baseDirs.splice(0)) {
          rmSync(baseDir, { recursive: true, force: true, maxRetries: 3 });
        }
      }
    }
  });

  function createApp(options: MockClusterOptions = {}) {
    // Give every cluster its own logs/run files, including when other mock
    // suites are using the original fixture in parallel.
    const baseDir = mkdtempSync(getFixtures('cluster-port-'));
    baseDirs.push(baseDir);
    for (const entry of ['package.json', 'app', 'config']) {
      cpSync(getFixtures(`simple/${entry}`), path.join(baseDir, entry), { recursive: true });
    }
    const app = mm.cluster({
      baseDir,
      cache: false,
      coverage: false,
      ...options,
    });
    apps.push(app);
    return app;
  }

  async function assertAddress(app: MockClusterApplication) {
    assert(app.port > 0);
    assert.equal(app.address().port, app.port);
    assert.equal(new URL(app.url).port, String(app.port));
    await app.httpRequest().get('/').expect('hi').expect(200);
    assert.equal(app.getAppInstanceProperty('options').port, app.port);
  }

  it('should avoid an occupied legacy counter port', async () => {
    occupied = net.createServer();
    occupied.listen(0);
    await once(occupied, 'listening');
    const port = (occupied.address() as AddressInfo).port;
    // Separate Vitest threads share a PID but not this counter. Reproduce a
    // counter pointing at a port that another cluster is already using.
    mm(globalThis, 'eggMockMasterPort', port - 1);
    const app = createApp({ workers: 2 });
    await app.ready();
    assert.notEqual(app.port, port);
    await assertAddress(app);
  });

  it('should start concurrent clusters on different default ports', async () => {
    const app = createApp();
    const other = createApp();
    await Promise.all([app.ready(), other.ready()]);
    assert.notEqual(app.port, other.port);
    await Promise.all([assertAddress(app), assertAddress(other)]);
  });

  it('should preserve an explicit port', async () => {
    const port = await detectPort();
    const app = createApp({ port });
    await app.ready();
    assert.equal(app.port, port);
    await assertAddress(app);
  });

  it('should report the default port in worker_threads mode', async () => {
    const app = createApp({ startMode: 'worker_threads' });
    await app.ready();
    await assertAddress(app);
  });

  it('should preserve port zero as the application configured port', async () => {
    const port = await detectPort();
    const app = createApp({
      port: 0,
      opt: { env: { ...process.env, EGG_APP_CONFIG: JSON.stringify({ cluster: { listen: { port } } }) } },
    });
    await app.ready();
    assert.equal(app.port, port);
    await assertAddress(app);
  });
});
