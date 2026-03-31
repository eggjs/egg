import { strict as assert } from 'node:assert';
import http from 'node:http';

import { describe, it, beforeAll, afterAll } from 'vitest';

import { createApp, type MockApplication, startNewLocalServer } from '../../utils.js';

describe('test/lib/core/httpclient_interceptor.test.ts', () => {
  describe('with interceptors configured', () => {
    let app: MockApplication;
    let url: string;
    let serverInfo: { url: string; server: http.Server };

    beforeAll(async () => {
      app = createApp('apps/httpclient-interceptor');
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

    it('should inject trace headers via interceptor', async () => {
      const res = await app.curl(url + '/get_headers', { dataType: 'json' });
      assert.equal(res.status, 200);
      assert.equal(res.data.headers['x-trace-id'], 'trace-123');
      // rpcId should be present
      assert(res.data.headers['x-rpc-id']);
      assert(res.data.headers['x-rpc-id'].startsWith('rpc-'));
    });

    it('should increment rpcId on each request', async () => {
      const res1 = await app.curl(url + '/get_headers', { dataType: 'json' });
      const rpcId1 = parseInt(res1.data.headers['x-rpc-id'].replace('rpc-', ''), 10);

      const res2 = await app.curl(url + '/get_headers', { dataType: 'json' });
      const rpcId2 = parseInt(res2.data.headers['x-rpc-id'].replace('rpc-', ''), 10);

      assert(rpcId2 > rpcId1, `Expected ${rpcId2} > ${rpcId1}`);
    });

    it('should work with httpClient.request directly', async () => {
      const res = await app.httpClient.request(url + '/get_headers', { dataType: 'json' });
      assert.equal(res.status, 200);
      assert.equal(res.data.headers['x-trace-id'], 'trace-123');
    });
  });

  describe('without interceptors configured', () => {
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

    it('should work normally without interceptors', async () => {
      const res = await app.curl(url + '/get_headers', { dataType: 'json' });
      assert.equal(res.status, 200);
      // No trace headers injected
      assert.equal(res.data.headers['x-trace-id'], undefined);
    });
  });
});
