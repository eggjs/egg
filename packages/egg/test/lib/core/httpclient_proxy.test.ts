import { strict as assert } from 'node:assert';
import http from 'node:http';

import { mm } from '@eggjs/mock';
import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';

import { createApp, type MockApplication, startNewLocalServer } from '../../utils.js';

describe('test/lib/core/httpclient_proxy.test.ts', () => {
  let app: MockApplication;
  let url: string;
  let serverInfo: { url: string; server: http.Server };

  beforeAll(async () => {
    app = createApp('apps/dnscache_httpclient');
    await app.ready();
    serverInfo = await startNewLocalServer();
    url = serverInfo.url;
  });

  afterAll(async () => {
    if (serverInfo?.server?.listening) {
      serverInfo.server.close();
    }
    await app.close();
  });

  afterEach(mm.restore);

  it('should app.httpClient return a proxy', () => {
    // Accessing app.httpClient should not throw
    const client = app.httpClient;
    assert(client);
    // The proxy should look like an HttpClient from the outside
    assert(typeof client.request === 'function');
    assert(typeof client.curl === 'function');
  });

  it('should app.httpclient be the same as app.httpClient', () => {
    assert.equal(app.httpclient, app.httpClient);
  });

  it('should curl work through the proxy', async () => {
    const res = await app.curl(url + '/get_headers', { dataType: 'json' });
    assert.equal(res.status, 200);
  });

  it('should httpClient.request work through the proxy', async () => {
    const res = await app.httpClient.request(url + '/get_headers', { dataType: 'json' });
    assert.equal(res.status, 200);
  });

  it('should proxy support get/set/has/delete/ownKeys/getPrototypeOf', () => {
    const client = app.httpClient;

    // has
    assert('request' in client);
    assert('curl' in client);

    // get
    assert.equal(typeof client.request, 'function');

    // set (custom property)
    (client as any)._customProp = 'test';
    assert.equal((client as any)._customProp, 'test');

    // delete
    delete (client as any)._customProp;
    assert.equal((client as any)._customProp, undefined);

    // ownKeys
    const keys = Object.keys(client);
    assert(Array.isArray(keys));

    // getPrototypeOf
    const proto = Object.getPrototypeOf(client);
    assert(proto);
  });

  it('should support mm() mock on httpClient (egg-mock compatibility)', async () => {
    // Mock request via mm (uses Object.defineProperty internally)
    mm(app.httpClient, 'request', async () => {
      return {
        status: 200,
        headers: {},
        data: { mocked: true },
      };
    });

    const res = await app.httpClient.request(url + '/get_headers');
    assert.equal(res.status, 200);
    assert.deepEqual(res.data, { mocked: true });

    // Restore
    mm.restore();

    // After restore, should use real HttpClient again
    const realRes = await app.httpClient.request(url + '/get_headers', { dataType: 'json' });
    assert.equal(realRes.status, 200);
    assert.notDeepEqual(realRes.data, { mocked: true });
  });

  it('should support mm() mock on httpclient (deprecated alias)', async () => {
    mm(app.httpclient, 'request', async () => {
      return {
        status: 418,
        headers: {},
        data: 'teapot',
      };
    });

    const res = await app.httpclient.request(url + '/get_headers');
    assert.equal(res.status, 418);
    assert.equal(res.data, 'teapot');

    mm.restore();
  });

  it('should custom lookup config take effect through proxy', async () => {
    // The dnscache_httpclient fixture has a custom lookup that resolves
    // all hostnames to 127.0.0.1, so we can test with a custom hostname
    const customUrl = url.replace('127.0.0.1', 'custom-localhost');
    const res = await app.curl(customUrl + '/get_headers', { dataType: 'json' });
    assert.equal(res.status, 200);
  });
});
