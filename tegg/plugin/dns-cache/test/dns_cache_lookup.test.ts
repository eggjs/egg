import assert from 'node:assert';
import { promises as dns } from 'node:dns';
import path from 'node:path';
import { parse as urlParse } from 'node:url';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';

import * as utils from './utils.ts';

const mockLookupPromise = (app: any) => {
  mm(app.dnsResolver, 'lookup', async () => {
    return [{ address: '127.0.0.1', family: 4 }];
  });
};

describe('test/dns_cache_lookup.test.ts', () => {
  let app: MockApplication;
  let url: string;
  let host: string;
  let originalDNSServers: string[];

  beforeAll(async () => {
    app = mm.app({
      baseDir: path.join(import.meta.dirname, 'fixtures', 'apps', 'dns_cache_lookup'),
    });
    await app.ready();
    url = await utils.startLocalServer();
    url = url.replace('127.0.0.1', 'localhost');
    host = new URL(url).host!;
    originalDNSServers = dns.getServers();
    if (!process.env.CI) {
      try {
        dns.setServers(['223.5.5.5', '223.6.6.6']);
      } catch (error) {
        app.logger.error('set dns servers error:', error);
      }
    }
  });

  afterAll(() => {
    try {
      dns.setServers(originalDNSServers);
    } catch (error) {
      app.logger.error('set dns servers error:', error);
    }
    return app.close();
  });

  afterEach(() => {
    app.dnsResolver.resetCache(true);
    mm.restore();
  });

  it('should ctx.curl work and set host', async () => {
    await app
      .httpRequest()
      .get('/?url=' + encodeURIComponent(url + '/get_headers'))
      .expect(200)
      .expect(/"host":"localhost:\d+"/);
    await app
      .httpRequest()
      .get('/?url=' + encodeURIComponent(url + '/get_headers') + '&host=localhost.foo.com')
      .expect(200)
      .expect(/"host":"localhost\.foo\.com"/);
    await app
      .httpRequest()
      .get('/?url=' + encodeURIComponent(url + '/get_headers') + '&Host=localhost2.foo.com')
      .expect(200)
      .expect(/"host":"localhost2\.foo\.com"/);
  });

  it('should throw error when the first dns lookup fail', async () => {
    await app
      .httpRequest()
      .get('/?url=' + encodeURIComponent('http://notexists-1111111local-domain.com'))
      .expect(500)
      .expect(/getaddrinfo ENOTFOUND notexists-1111111local-domain\.com/);
  });

  it('should use local cache dns result when dns lookup error', async () => {
    mockLookupPromise(app);
    await app
      .httpRequest()
      .get('/?url=' + encodeURIComponent(url + '/get_headers'))
      .expect(200)
      .expect(/"host":"localhost:\d+"/);

    // mock local cache expires and mock dns lookup throw error
    const record = app.dnsResolver.getCacheRecord('localhost');
    if (record) record.timestamp = 0;
    mm.error(app.dnsResolver, 'lookup', 'mock dns lookup error');

    await app
      .httpRequest()
      .get('/?url=' + encodeURIComponent(url + '/get_headers'))
      .expect(200)
      .expect(/"host":"localhost:\d+"/);
  });

  it('should app.curl work', async () => {
    const result = await app.curl(url + '/get_headers', { dataType: 'json' });
    assert(result.status === 200);
    assert(result.data.host === host);

    const result2 = await app.httpclient.curl(url + '/get_headers', {
      dataType: 'json',
    });
    assert(result2.status === 200);
    assert(result2.data.host === host);
  });

  it('should app.curl work on lookup error', async () => {
    const result = await app.curl(url + '/get_headers', { dataType: 'json' });
    assert(result.status === 200);
    assert(result.data.host === host);

    // mock local cache expires and mock dns lookup throw error
    const record = app.dnsResolver.getCacheRecord('localhost');
    if (record) record.timestamp = 0;
    mm.error(app.dnsResolver, 'lookup', 'mock dns lookup error');
    const result2 = await app.httpclient.curl(url + '/get_headers', {
      dataType: 'json',
    });
    assert(result2.status === 200);
    assert(result2.data.host === host);
  });

  it('should app.curl(obj)', async () => {
    const obj = urlParse(url + '/get_headers');
    const result = await app.curl(obj as any, { dataType: 'json' });
    assert(result.status === 200);
    assert(result.data.host === host);

    const obj2 = urlParse(url + '/get_headers');
    // mock obj2.host
    obj2.host = '';
    const result2 = await app.curl(obj2 as any, { dataType: 'json' });
    assert(result2.status === 200);
    assert(result2.data.host === host);
  });

  it('should dnsCacheMaxLength work', async () => {
    const originalMaxLength = app.dnsResolver.maxCacheSize;
    app.dnsResolver.resetCacheSize(1);
    app.dnsResolver.resetCache(true);

    //
    mockLookupPromise(app);

    let obj = urlParse(url + '/get_headers');
    let result = await app.curl(obj as any, {
      dataType: 'json',
      timeout: 500,
    });
    assert(result.status === 200);
    assert(result.data.host === host);

    assert(app.dnsResolver.getCacheRecord('localhost'));

    obj = urlParse(url.replace('localhost', 'another.com') + '/get_headers');
    result = await app.curl(obj as any, { dataType: 'json', timeout: 500 });
    assert(result.status === 200);
    assert(result.data.host === obj.host);

    assert(!app.dnsResolver.getCacheRecord('localhost'));
    assert(app.dnsResolver.getCacheRecord('another.com'));

    app.dnsResolver.resetCacheSize(originalMaxLength);
    app.dnsResolver.resetCache();
  });

  it('should cache and update', async () => {
    mockLookupPromise(app);

    let obj = urlParse(url + '/get_headers');
    let result = await app.curl(obj as any, { dataType: 'json' });
    assert(result.status === 200);
    assert(result.data.host === host);
    let record = app.dnsResolver.getCacheRecord('localhost');
    const timestamp = record?.timestamp;
    assert(record);

    obj = urlParse(url + '/get_headers');
    result = await app.curl(obj as any, { dataType: 'json' });
    assert(result.status === 200);
    assert(result.data.host === host);
    record = app.dnsResolver.getCacheRecord('localhost');

    assert(record && timestamp === record.timestamp);

    await utils.sleep(3500); // should be longer than dnsCacheLookupInterval to trigger update
    obj = urlParse(url + '/get_headers');
    result = await app.curl(obj as any, { dataType: 'json' });
    assert(result.status === 200);
    assert(result.data.host === host);
    record = app.dnsResolver.getCacheRecord('localhost');

    assert(record && timestamp !== record.timestamp);
  });

  it('should not cache ip', async () => {
    const obj = urlParse(url.replace('localhost', '127.0.0.1') + '/get_headers');
    const result = await app.curl(obj as any, {
      dataType: 'json',
    });
    assert(result.status === 200);
    assert(result.data.host === obj.host);
    assert(!app.dnsResolver.getCacheRecord('127.0.0.1'));
  });

  describe('Fetch Integration', () => {
    it('should app.fetch work and set host', async () => {
      if (!app.fetch) {
        return;
      }
      let record = app.dnsResolver.getCacheRecord('localhost');
      assert(!record);
      const res = await app.fetch(url + '/get_headers');
      const data = (await res.json()) as any;
      assert(data?.host?.startsWith('localhost'));
      record = app.dnsResolver.getCacheRecord('localhost');
      assert(record);
    });

    it('should app.fetch work on lookup error', async () => {
      if (!app.fetch) {
        return;
      }
      // Manually wait for previous keepalive to expire
      await utils.sleep(3000);
      await app.fetch(url + '/get_headers', { keepalive: false });
      const record = app.dnsResolver.getCacheRecord('localhost');
      assert(record);
      mm.error(app.dnsResolver, 'lookup', 'mock dns lookup error');
      await utils.sleep(3000);
      const res = await app.fetch(url + '/get_headers', { keepalive: false });
      const data = (await res.json()) as any;
      assert(data?.host?.startsWith('localhost'));
    });

    it('should app.fetch work on lookup error with no cache', async () => {
      if (!app.fetch) {
        return;
      }
      await utils.sleep(3000);
      app.dnsResolver.resetCache(true);
      mm.error(app.dnsResolver, 'lookup', 'mock dns lookup error');
      let err: Error | null = null;
      try {
        await app.fetch(url + '/get_headers', { keepalive: false });
      } catch (e) {
        err = e as Error;
      }
      assert(err);
      assert(err!.message);
    });

    it('should throw error when the first fetch dns lookup fail', async () => {
      if (!app.fetch) {
        return;
      }
      try {
        await utils.sleep(3000);
        await app.fetch('http://notexists-1111111local-domain.com');
        assert.fail('Should have thrown an error');
      } catch (err) {
        // Fetch API wraps DNS errors in a TypeError with the actual error in err.cause
        assert(err instanceof TypeError);
        assert.strictEqual(err.message, 'fetch failed');
        assert((err as any).cause);
        assert.strictEqual((err as any).cause.code, 'ENOTFOUND');
        assert((err as any).cause.message.includes('getaddrinfo ENOTFOUND notexists-1111111local-domain.com'));
      }
    });
  });

  describe('DNS Address Rotation', () => {
    beforeAll(() => {
      return mm.restore();
    });

    it('should rotate addresses when multiple IPs are returned', async () => {
      // Mock lookup to return multiple addresses
      mm(app.dnsResolver, 'lookup', async () => {
        return [
          { address: '127.0.0.1', family: 4 },
          { address: '127.0.0.2', family: 4 },
          { address: '127.0.0.3', family: 4 },
        ];
      });

      // First request to populate cache
      await app.curl(url + '/get_headers', { dataType: 'json' });

      // Get cache entry to verify multiple records
      const entry: any = app.dnsResolver.getDnsCache().get('localhost');
      assert(entry);
      assert(entry.records);
      assert.strictEqual(entry.records.length, 3);
      assert.strictEqual(entry.records[0].ip, '127.0.0.1');
      assert.strictEqual(entry.records[1].ip, '127.0.0.2');
      assert.strictEqual(entry.records[2].ip, '127.0.0.3');

      // Verify rotation is enabled
      assert.strictEqual((app.dnsResolver as any).enableAddressRotation, true);

      const initialIndex = entry.currentIndex;

      // Make another request, should trigger rotation
      try {
        await app.curl(url + '/get_headers', {
          dataType: 'json',
        });
      } catch (err) {
        app.logger?.error(err);
      }

      // Index should have rotated
      const newIndex = entry.currentIndex;
      assert.strictEqual(newIndex, (initialIndex + 1) % 3);
    });

    it('should respect dnsAddressRotation=false config', async () => {
      // Temporarily disable rotation
      const originalRotation = (app.dnsResolver as any).enableAddressRotation;
      (app.dnsResolver as any).enableAddressRotation = false;
      app.dnsResolver.resetCache();

      // Mock lookup to return multiple addresses
      mm(app.dnsResolver, 'lookup', async () => {
        return [
          { address: '127.0.0.1', family: 4 },
          { address: '127.0.0.2', family: 4 },
        ];
      });

      // Populate cache
      await app.curl(url + '/get_headers', { dataType: 'json' });

      const entry: any = app.dnsResolver.getDnsCache().get('localhost');
      const initialIndex = entry.currentIndex;

      // Make multiple requests
      for (let i = 0; i < 3; i++) {
        await app.curl(url + '/get_headers', { dataType: 'json' });
      }

      // Index should not change when rotation is disabled
      assert.strictEqual(entry.currentIndex, initialIndex);

      // Restore original setting
      (app.dnsResolver as any).enableAddressRotation = originalRotation;
    });

    it('should rotate through all addresses cyclically', async () => {
      // Mock lookup to return 3 addresses (all pointing to 127.0.0.1 for testing)
      mm(app.dnsResolver, 'lookup', async () => {
        return [
          { address: '127.0.0.1', family: 4 },
          { address: '127.0.0.1', family: 4 },
          { address: '127.0.0.1', family: 4 },
        ];
      });

      // Reset cache to ensure clean state
      app.dnsResolver.resetCache(true);

      // First request to populate cache
      await app.curl(url + '/get_headers', {
        dataType: 'json',
        timeout: 500,
      });

      const entry: any = app.dnsResolver.getDnsCache().get('localhost');
      assert(entry);
      assert.strictEqual(entry.records.length, 3);

      // Record initial index after first request
      const indices = [entry.currentIndex];

      // Make 5 more requests (total 6) to complete 2 full cycles
      for (let i = 0; i < 5; i++) {
        await app.curl(url + '/get_headers', {
          dataType: 'json',
          timeout: 500,
        });
        indices.push(entry.currentIndex);
      }

      // Verify cyclic pattern
      // Each curl triggers one DNS lookup, advancing index by 1
      assert.strictEqual(indices[0], 1); // after 1st request: 0->1
      assert.strictEqual(indices[1], 2); // after 2nd request: 1->2
      assert.strictEqual(indices[2], 0); // after 3rd request: 2->0 (wraps)
      assert.strictEqual(indices[3], 1); // after 4th request: 0->1
      assert.strictEqual(indices[4], 2); // after 5th request: 1->2
      assert.strictEqual(indices[5], 0); // after 6th request: 2->0 (wraps)
    });

    it('should rotate with fetch', async () => {
      if (!app.fetch) {
        return;
      }
      mm(app.dnsResolver, 'lookup', async () => {
        return [
          { address: '127.0.0.1', family: 4 },
          { address: '127.0.0.1', family: 4 },
        ];
      });
      // First request to populate cache

      await app.fetch(url + '/get_headers');

      const entry: any = app.dnsResolver.getDnsCache().get('localhost');
      assert(entry);
      const initialIndex = entry.currentIndex;

      // Make another request, should trigger rotation
      await app.fetch(url + '/get_headers');

      // Index should have rotated
      const newIndex = entry.currentIndex;
      assert.strictEqual(newIndex, (initialIndex + 1) % 1);
    });
  });
});
