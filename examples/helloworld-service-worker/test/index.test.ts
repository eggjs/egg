import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import path from 'node:path';

import { ServiceWorkerApp } from '@eggjs/service-worker';
import { afterAll, beforeAll, describe, it } from 'vitest';

describe('examples/helloworld-service-worker', () => {
  let app: ServiceWorkerApp;
  let base: string;

  beforeAll(async () => {
    app = new ServiceWorkerApp(path.join(__dirname, '../app'));
    const server = await app.serve();
    const { address, port } = server.address() as AddressInfo;
    base = `http://${address}:${port}`;
  });

  afterAll(async () => {
    await app.destroy();
  });

  it('should say hello over http', async () => {
    const res = await fetch(`${base}/hello/?name=egg`);
    assert.deepEqual(await res.json(), { message: 'hello, egg' });
  });

  it('should serve the calc MCP tool', async () => {
    const res = await fetch(`${base}/mcp/calc/stream`, {
      method: 'POST',
      headers: {
        accept: 'application/json, text/event-stream',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'add', arguments: { a: 1, b: 41 } },
      }),
    });
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.match(text, /hello, mcp: 42/);
  });
});
