import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import path from 'node:path';

import { afterAll, beforeAll, describe, it } from 'vitest';

import { ServiceWorkerApp } from '../src/index.ts';

describe('standalone/service-worker/test/MultiApp.test.ts', () => {
  let app1: ServiceWorkerApp;
  let app2: ServiceWorkerApp;
  let base1: string;
  let base2: string;

  beforeAll(async () => {
    // Two apps loading the SAME fixture concurrently: routers, registries and
    // singletons must stay per-app (TeggScope isolation).
    app1 = new ServiceWorkerApp(path.join(__dirname, 'fixtures/hello-app'));
    app2 = new ServiceWorkerApp(path.join(__dirname, 'fixtures/hello-app'));
    const [server1, server2] = await Promise.all([app1.serve(), app2.serve()]);
    base1 = `http://127.0.0.1:${(server1.address() as AddressInfo).port}`;
    base2 = `http://127.0.0.1:${(server2.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await Promise.all([app1.destroy(), app2.destroy()]);
  });

  it('should serve both apps independently', async () => {
    const [res1, res2] = await Promise.all([fetch(`${base1}/hello/`), fetch(`${base2}/hello/`)]);
    assert.equal(res1.status, 200);
    assert.equal(res2.status, 200);
    assert.deepEqual(await res1.json(), { message: 'hello, tegg' });
    assert.deepEqual(await res2.json(), { message: 'hello, tegg' });
  });

  it('should keep per-app event injection isolated under concurrent requests', async () => {
    const [res1, res2] = await Promise.all([fetch(`${base1}/hello/event`), fetch(`${base2}/hello/event`)]);
    const url1 = ((await res1.json()) as { url: string }).url;
    const url2 = ((await res2.json()) as { url: string }).url;
    assert.match(url1, new RegExp(`^${base1}`));
    assert.match(url2, new RegExp(`^${base2}`));
  });
});
