import assert from 'node:assert/strict';
import type http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';

import { afterAll, beforeAll, describe, it } from 'vitest';

import { FetchEventImpl, ServiceWorkerApp } from '../src/index.ts';
import { backgroundFlags } from './fixtures/hello-app/HelloController.ts';

describe('standalone/service-worker/test/ServiceWorkerApp.test.ts', () => {
  let app: ServiceWorkerApp;
  let server: http.Server;
  let base: string;

  beforeAll(async () => {
    app = new ServiceWorkerApp(path.join(__dirname, 'fixtures/hello-app'));
    server = await app.serve();
    const { address, port } = server.address() as AddressInfo;
    base = `http://${address}:${port}`;
  });

  afterAll(async () => {
    await app.destroy();
  });

  it('should serve a controller over node:http', async () => {
    const res = await fetch(`${base}/hello/`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { message: 'hello, tegg' });
  });

  it('should bind path params and query', async () => {
    const res = await fetch(`${base}/hello/users/42?role=admin`);
    assert.deepEqual(await res.json(), { id: '42', role: 'admin' });
  });

  it('should bind json body', async () => {
    const res = await fetch(`${base}/hello/echo`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ foo: 'bar' }),
    });
    assert.deepEqual(await res.json(), { received: { foo: 'bar' } });
  });

  it('should pass through a returned Response as-is', async () => {
    const res = await fetch(`${base}/hello/raw`);
    assert.equal(res.status, 201);
    assert.equal(res.headers.get('x-raw'), '1');
    assert.equal(await res.text(), 'raw-body');
  });

  it('should run method middlewares', async () => {
    const res = await fetch(`${base}/hello/middleware`);
    assert.deepEqual(await res.json(), { fromMiddleware: 'yes' });
  });

  it('should inject the fetch event into context protos', async () => {
    const res = await fetch(`${base}/hello/event`);
    const { url } = (await res.json()) as { url: string };
    assert.match(url, /\/hello\/event$/);
  });

  it('should support BackgroundTaskHelper and drain on ctx destroy', async () => {
    const res = await fetch(`${base}/hello/background`);
    assert.deepEqual(await res.json(), { started: true });
    // ctx destroy drains background tasks; give the event loop a tick
    for (let i = 0; i < 50 && backgroundFlags.length === 0; i++) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.deepEqual(backgroundFlags, ['done']);
  });

  it('should load module.yml as moduleConfig', async () => {
    const res = await fetch(`${base}/hello/module-config`);
    assert.deepEqual(await res.json(), { features: { greeting: 'howdy' } });
  });

  it('should return the unified error shape for unknown routes', async () => {
    const res = await fetch(`${base}/nope`);
    assert.equal(res.status, 404);
    const body = (await res.json()) as { code: string; message: string };
    assert.equal(body.code, 'NOT_FOUND');
    assert.match(body.message, /GET \/nope/);
  });

  it('should return the unified error shape for controller errors', async () => {
    const res = await fetch(`${base}/stream/boom`);
    assert.equal(res.status, 500);
    assert.deepEqual(await res.json(), {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'stream controller boom',
    });
  });

  it('should merge ctx.responseHeaders onto the final response', async () => {
    const res = await fetch(`${base}/stream/headers`);
    assert.equal(res.headers.get('x-service-worker'), 'on');
    assert.deepEqual(await res.json(), { ok: true });
  });

  it('should keep context protos alive until a streaming response is drained', async () => {
    const res = await fetch(`${base}/stream/sse`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'text/event-stream');
    // chunks are produced 30ms apart, well after handleEvent has returned;
    // without the stream guard the probe is destroyed first and emits DEAD
    const text = await res.text();
    assert.equal(text, 'data: chunk-0\n\ndata: chunk-1\n\ndata: chunk-2\n\n');
  });

  it('should handle embedded events without a server', async () => {
    const event = new FetchEventImpl(new Request('http://embedded.local/hello/'));
    const response = await app.handleEvent<Response>(event);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { message: 'hello, tegg' });
  });
});
