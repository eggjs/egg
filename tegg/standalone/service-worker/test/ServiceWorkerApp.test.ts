import assert from 'node:assert/strict';
import type http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';

import { FetchEventImpl, ServiceWorkerFetchContext } from '@eggjs/service-worker-controller';
import { ModuleConfigUtil } from '@eggjs/tegg-common-util';
import { TeggScope } from '@eggjs/tegg-types';
import { afterAll, beforeAll, describe, it } from 'vitest';

import { ServiceWorkerApp } from '../src/index.ts';
import { backgroundFlags } from './fixtures/hello-app/HelloController.ts';

const HELLO_APP = path.join(__dirname, 'fixtures/hello-app');

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

  it('should stream a Node Readable return value', async () => {
    const res = await fetch(`${base}/edge/node-stream`);
    assert.equal(res.status, 200);
    assert.equal(await res.text(), 'node-readable');
  });

  it('should preserve multiple Set-Cookie headers over node:http', async () => {
    const res = await fetch(`${base}/edge/cookies`);
    assert.deepEqual(res.headers.getSetCookie(), ['a=1', 'b=2']);
  });

  it('should merge responseHeaders onto an immutable Response without 500', async () => {
    const res = await fetch(`${base}/edge/immutable`, { redirect: 'manual' });
    assert.equal(res.status, 302);
    assert.equal(res.headers.get('x-added'), '1');
  });

  it('should return a Uint8Array body as bytes, not JSON', async () => {
    const res = await fetch(`${base}/edge/bytes`);
    assert.equal(await res.text(), 'byte-body');
  });

  it('should preserve multiple ctx.responseHeaders Set-Cookie on the merged response', async () => {
    const res = await fetch(`${base}/edge/mw-cookies`);
    assert.deepEqual(res.headers.getSetCookie(), ['x=1', 'y=2']);
    assert.deepEqual(await res.json(), { ok: true });
  });

  it('should run aop-mode middlewares (@Middleware with advice classes)', async () => {
    const res = await fetch(`${base}/aop-mw/aop`);
    assert.deepEqual(await res.json(), { body: { msg: 'hello' } });
  });

  it('should let an aop-mode middleware catch controller errors', async () => {
    const res = await fetch(`${base}/aop-mw/error`);
    assert.deepEqual(await res.json(), { body: { message: 'mock error' } });
  });

  it('should run a @Pointcut advice on a controller method', async () => {
    const res = await fetch(`${base}/pc/run`);
    assert.deepEqual(await res.json(), { msg: 'hello', count: 0 });
  });

  it('should run a CONTEXT-init @Pointcut advice with a fresh instance per request', async () => {
    // ctxCount stays 1 across requests only if the advice is context-scoped
    // (a fresh instance each request); a leaked singleton would increment.
    assert.deepEqual(await (await fetch(`${base}/ctxpc/run`)).json(), { msg: 'hello', ctxCount: 1 });
    assert.deepEqual(await (await fetch(`${base}/ctxpc/run`)).json(), { msg: 'hello', ctxCount: 1 });
  });

  it('should run @Middleware (koa layer) and @Pointcut (aop layer) together', async () => {
    // @Pointcut runs inside the method and mutates the raw return ({ msg, count });
    // the handler normalizes it into ctx.body; the outer koa @Middleware then reads
    // that normalized body and wraps it. Both layers work with no ResponseAdvice.
    const res = await fetch(`${base}/combo/run`);
    assert.deepEqual(await res.json(), { body: { msg: 'hello', count: 0 } });
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

  it('should support the service worker fetch-event interface (respondWith)', async () => {
    // The exact wiring a Service Worker runtime uses:
    //   self.addEventListener('fetch', e => e.respondWith(app.handleEvent(e)))
    const onFetch = (event: FetchEventImpl) => event.respondWith(app.handleEvent<Response>(event));
    const event = new FetchEventImpl(new Request('http://embedded.local/hello/'));
    onFetch(event);
    const response = await event.responsePromise!;
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { message: 'hello, tegg' });
  });
});

describe('standalone/service-worker/test/ServiceWorkerApp.test.ts host seams', () => {
  it('should map controller errors through a custom errorResponseMapper', async () => {
    const app = new ServiceWorkerApp(HELLO_APP, {
      innerObjectHandlers: {
        errorResponseMapper: [
          {
            obj: {
              toResponse(error: unknown) {
                return new Response(JSON.stringify({ mapped: (error as Error).message }), {
                  status: 418,
                  headers: { 'content-type': 'application/json' },
                });
              },
            },
          },
        ],
      },
    });
    const server = await app.serve();
    const { address, port } = server.address() as AddressInfo;
    try {
      const res = await fetch(`http://${address}:${port}/stream/boom`);
      assert.equal(res.status, 418);
      assert.deepEqual(await res.json(), { mapped: 'stream controller boom' });
    } finally {
      await app.destroy();
    }
  });

  it('should build the request context through a custom fetchContextFactory', async () => {
    const seen: string[] = [];
    const app = new ServiceWorkerApp(HELLO_APP, {
      innerObjectHandlers: {
        fetchContextFactory: [
          {
            obj: {
              create(init: ConstructorParameters<typeof ServiceWorkerFetchContext>[0]) {
                seen.push(new URL(init.event.request.url).pathname);
                return new ServiceWorkerFetchContext(init);
              },
            },
          },
        ],
      },
    });
    const server = await app.serve();
    const { address, port } = server.address() as AddressInfo;
    try {
      await fetch(`http://${address}:${port}/hello/`);
      assert.deepEqual(seen, ['/hello/']);
    } finally {
      await app.destroy();
    }
  });

  it('should not clobber a pre-set ModuleConfigUtil.configNames', async () => {
    const app = new ServiceWorkerApp(HELLO_APP);
    // Host selection chain set in the app's scope bag before init must survive.
    TeggScope.run(app.app.scopeBag, () => {
      ModuleConfigUtil.configNames = ['module.default', 'module.beta'];
    });
    const server = await app.serve();
    const { address, port } = server.address() as AddressInfo;
    try {
      const res = await fetch(`http://${address}:${port}/hello/module-config`);
      assert.deepEqual(await res.json(), { features: { greeting: 'beta-hi' } });
    } finally {
      await app.destroy();
    }
  });
});
