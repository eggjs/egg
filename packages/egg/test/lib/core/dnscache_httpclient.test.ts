import { strict as assert } from 'node:assert';
import http from 'node:http';

import { describe, it, beforeAll, afterAll } from 'vitest';

import { createApp, type MockApplication, startNewLocalServer } from '../../utils.js';

describe('test/lib/core/dnscache_httpclient.test.ts', () => {
  let app: MockApplication;
  let url: string;
  let serverInfo: { url: string; server: http.Server };

  beforeAll(async () => {
    app = createApp('apps/dnscache_httpclient');
    await app.ready();
    serverInfo = await startNewLocalServer();
    url = serverInfo.url.replace('127.0.0.1', 'custom-localhost');
  });

  afterAll(() => {
    if (serverInfo?.server?.listening) {
      serverInfo.server.close();
    }
  });

  it('should bypass dns resolve', async () => {
    // will not resolve ip
    const res = await app.curl(serverInfo.url + '/get_headers', { dataType: 'json' });
    assert(res.status === 200);
  });

  it('should curl work', async () => {
    // will resolve custom-localhost to 127.0.0.1
    const res = await app.curl(url + '/get_headers', { dataType: 'json' });
    assert(res.status === 200);
  });

  it('should safeCurl also work', async () => {
    // will resolve custom-localhost to 127.0.0.1
    const res = await app.safeCurl(url + '/get_headers', { dataType: 'json' });
    assert(res.status === 200);
  });

  it('should safeCurl also work', async () => {
    // will resolve custom-localhost to 127.0.0.1
    const res = await app.safeCurl(url + '/get_headers', { dataType: 'json' });
    assert(res.status === 200);
  });

  it('should server down and catch error', async () => {
    try {
      if (serverInfo?.server?.listening) await serverInfo.server.close();
      // will resolve to 127.0.0.1
      const res = await app.curl(url + '/get_headers', { dataType: 'json' });
      assert(res.status !== 200);
    } catch (err: any) {
      assert(err);
      assert(err.message.includes('ECONNREFUSED'));
    }
  });
});
