const mm = require('egg-mock');
const assert = require('assert');
const dns = require('dns').promises;
const urlparse = require('url').parse;
const utils = require('../../utils');

const mockLookupPromise = app => {
  mm(app.dnsResolver.lookupPromises, 'lookup', async (hostname, options) => {
    // When called with {all: true}, return array
    if (options && options.all) {
      return [{ address: '127.0.0.1', family: 4 }];
    }
    return { address: '127.0.0.1', family: 4 };
  });
};

describe('test/lib/core/dnscache_httpclient.test.js', () => {
  let app;
  let url;
  let host;
  let originalDNSServers;

  before(async () => {
    app = utils.app('apps/dnscache_httpclient');
    await app.ready();
    app.httpclient; // initialize dnsResolver
    url = await utils.startLocalServer();
    url = url.replace('127.0.0.1', 'localhost');
    host = urlparse(url).host;
    originalDNSServers = dns.getServers();
  });

  afterEach(() => {
    app.dnsResolver.resetCache();
    mm.restore();
    dns.setServers(originalDNSServers);
  });

  it('should ctx.curl work and set host', async () => {
    await app.httpRequest()
      .get('/?url=' + encodeURIComponent(url + '/get_headers'))
      .expect(200)
      .expect(/"host":"localhost:\d+"/);
    await app.httpRequest()
      .get('/?url=' + encodeURIComponent(url + '/get_headers') + '&host=localhost.foo.com')
      .expect(200)
      .expect(/"host":"localhost\.foo\.com"/);
    await app.httpRequest()
      .get('/?url=' + encodeURIComponent(url + '/get_headers') + '&Host=localhost2.foo.com')
      .expect(200)
      .expect(/"host":"localhost2\.foo\.com"/);
  });

  /**
   * This test failure can be totally ignored because it depends on how your service provider
   * deals with the domain when you cannot find that：Some providers will batchly switch
   * those invalid domains to a certain server. So you can still find the fixed IP by
   * calling `dns.lookup()`.
   *
   * To make sure that your domain exists or not, just use `ping your_domain_here` instead.
   */
  it('should throw error when the first dns lookup fail', async () => {
    if (!process.env.CI) {
      // Avoid Network service provider DNS pollution
      // alidns http://www.alidns.com/node-distribution/
      // Not sure it will work for all servers
      dns.setServers([
        '223.5.5.5',
        '223.6.6.6',
      ]);
    }
    await app.httpRequest()
      .get('/?url=' + encodeURIComponent('http://notexists-1111111local-domain.com'))
      .expect(500)
      .expect(/getaddrinfo ENOTFOUND notexists-1111111local-domain\.com/);
  });

  it('should use local cache dns result when dns lookup error', async () => {
    mockLookupPromise(app);
    await app.httpRequest()
      .get('/?url=' + encodeURIComponent(url + '/get_headers'))
      .expect(200)
      .expect(/"host":"localhost:\d+"/);
    // mock local cache expires and mock dns lookup throw error
    app.dnsResolver.getCacheRecord('localhost').timestamp = 0;
    mm.error(app.dnsResolver.lookupPromises, 'lookup', 'mock dns lookup error');
    await app.httpRequest()
      .get('/?url=' + encodeURIComponent(url + '/get_headers'))
      .expect(200)
      .expect(/"host":"localhost:\d+"/);
  });

  it('should app.curl work', async () => {
    const result = await app.curl(url + '/get_headers', { dataType: 'json' });
    assert(result.status === 200);
    assert(result.data.host === host);

    const result2 = await app.httpclient.curl(url + '/get_headers', { dataType: 'json' });
    assert(result2.status === 200);
    assert(result2.data.host === host);
  });

  it('should app.curl work on lookup error', async () => {
    const result = await app.curl(url + '/get_headers', { dataType: 'json' });
    assert(result.status === 200);
    assert(result.data.host === host);

    // mock local cache expires and mock dns lookup throw error
    app.dnsResolver.getCacheRecord('localhost').timestamp = 0;
    mm.error(app.dnsResolver.lookupPromises, 'lookup', 'mock dns lookup error');
    const result2 = await app.httpclient.curl(url + '/get_headers', { dataType: 'json' });
    assert(result2.status === 200);
    assert(result2.data.host === host);
  });

  it('should app.curl(obj)', async () => {
    const obj = urlparse(url + '/get_headers');
    const result = await app.curl(obj, { dataType: 'json' });
    assert(result.status === 200);
    assert(result.data.host === host);

    const obj2 = urlparse(url + '/get_headers');
    // mock obj2.host
    obj2.host = null;
    const result2 = await app.curl(obj2, { dataType: 'json' });
    assert(result2.status === 200);
    assert(result2.data.host === host);
  });

  it('should dnsCacheMaxLength work', async () => {
    const originalMaxLength = app.dnsResolver.maxCacheSize;
    app.dnsResolver.maxCacheSize = 1;
    app.dnsResolver.resetCache();

    mockLookupPromise(app);


    let obj = urlparse(url + '/get_headers');
    let result = await app.curl(obj, { dataType: 'json' });
    assert(result.status === 200);
    assert(result.data.host === host);

    assert(app.dnsResolver.getCacheRecord('localhost'));

    obj = urlparse(url.replace('localhost', 'another.com') + '/get_headers');
    result = await app.curl(obj, { dataType: 'json' });
    assert(result.status === 200);
    assert(result.data.host === obj.host);

    assert(!app.dnsResolver.getCacheRecord('localhost'));
    assert(app.dnsResolver.getCacheRecord('another.com'));

    app.dnsResolver.maxCacheSize = originalMaxLength;
    app.dnsResolver.resetCache();
  });

  it('should cache and update', async () => {
    mockLookupPromise(app);

    let obj = urlparse(url + '/get_headers');
    let result = await app.curl(obj, { dataType: 'json' });
    assert(result.status === 200);
    assert(result.data.host === host);
    let record = app.dnsResolver.getCacheRecord('localhost');
    const timestamp = record.timestamp;
    assert(record);

    obj = urlparse(url + '/get_headers');
    result = await app.curl(obj, { dataType: 'json' });
    assert(result.status === 200);
    assert(result.data.host === host);
    record = app.dnsResolver.getCacheRecord('localhost');

    assert(timestamp === record.timestamp);

    await utils.sleep(3500); // should be longer than dnsCacheLookupInterval to trigger update
    obj = urlparse(url + '/get_headers');
    result = await app.curl(obj, { dataType: 'json' });
    assert(result.status === 200);
    assert(result.data.host === host);
    record = app.dnsResolver.getCacheRecord('localhost');

    assert(timestamp !== record.timestamp);
  });

  it('should cache and update with agent', async () => {
    const agent = app._agent;
    // Initialize agent's httpclient to create dnsResolver
    agent.httpclient;
    mockLookupPromise(agent);

    let obj = urlparse(url + '/get_headers');
    let result = await agent.curl(obj, { dataType: 'json' });
    assert(result.status === 200);
    assert(result.data.host === host);
    let record = agent.dnsResolver.getCacheRecord('localhost');
    assert(record);
    const timestamp = record.timestamp;

    obj = urlparse(url + '/get_headers');
    result = await agent.curl(obj, { dataType: 'json' });
    assert(result.status === 200);
    assert(result.data.host === host);
    record = agent.dnsResolver.getCacheRecord('localhost');
    assert(timestamp === record.timestamp);

    await utils.sleep(3500);
    obj = urlparse(url + '/get_headers');
    result = await agent.curl(obj, { dataType: 'json' });
    assert(result.status === 200);
    assert(result.data.host === host);
    record = agent.dnsResolver.getCacheRecord('localhost');
    assert(timestamp !== record.timestamp);
  });

  it('should not cache ip', async () => {
    const obj = urlparse(url.replace('localhost', '127.0.0.1') + '/get_headers');
    const result = await app.curl(obj, { dataType: 'json' });
    assert(result.status === 200);
    assert(result.data.host === obj.host);
    assert(!app.dnsResolver.getCacheRecord('127.0.0.1'));
  });

  it('disable DNSCache in one request should work', async () => {
    mockLookupPromise(app);
    await app.httpRequest()
      .get('/?disableDNSCache=true&url=' + encodeURIComponent(url + '/get_headers'))
      .expect(200)
      .expect(/"host":"localhost:\d+"/);
    assert(app.dnsResolver.getDnsCache().size === 0);

    await app.httpRequest()
      .get('/??disableDNSCache=false&url=' + encodeURIComponent(url + '/get_headers'))
      .expect(200)
      .expect(/"host":"localhost:\d+"/);
    assert(app.dnsResolver.getDnsCache().size === 1);
  });

  describe('DNS Address Rotation', () => {
    before(async () => {
      mm.restore();
    });
    it('should rotate addresses when multiple IPs are returned', async () => {
      // Mock lookup to return multiple addresses
      mm(app.dnsResolver.lookupPromises, 'lookup', async (hostname, options) => {
        if (options && options.all) {
          return [
            { address: '127.0.0.1', family: 4 },
            { address: '127.0.0.2', family: 4 },
            { address: '127.0.0.3', family: 4 },
          ];
        }
        return { address: '127.0.0.1', family: 4 };
      });

      // First request to populate cache
      await app.curl(url + '/get_headers', { dataType: 'json', timeout: 1000 });

      // Get cache entry to verify multiple records
      const entry = app.dnsResolver.getDnsCache().get('localhost');
      assert(entry);
      assert(entry.records);
      assert.strictEqual(entry.records.length, 3);
      assert.strictEqual(entry.records[0].ip, '127.0.0.1');
      assert.strictEqual(entry.records[1].ip, '127.0.0.2');
      assert.strictEqual(entry.records[2].ip, '127.0.0.3');

      // Verify rotation is enabled
      assert.strictEqual(app.dnsResolver.enableAddressRotation, true);

      // Verify currentIndex changes after curl request

      const initialIndex = entry.currentIndex;

      // Make another request, should trigger rotation
      try {
        await app.curl(url + '/get_headers', { dataType: 'json', timeout: 1000 });
      } catch (err) {
        console.log('Expected curl error due to mock servers not running:', err.message);
      }

      // Index should have rotated
      const newIndex = entry.currentIndex;
      assert.strictEqual(newIndex, (initialIndex + 1) % 3);
    });

    it('should respect dnsAddressRotation=false config', async () => {
      // Temporarily disable rotation
      const originalRotation = app.dnsResolver.enableAddressRotation;
      app.dnsResolver.enableAddressRotation = false;
      app.dnsResolver.resetCache();

      // Mock lookup to return multiple addresses
      mm(app.dnsResolver.lookupPromises, 'lookup', async (hostname, options) => {
        if (options && options.all) {
          return [
            { address: '127.0.0.1', family: 4 },
            { address: '127.0.0.2', family: 4 },
          ];
        }
        return { address: '127.0.0.1', family: 4 };
      });

      // Populate cache
      await app.curl(url + '/get_headers', { dataType: 'json' });

      const entry = app.dnsResolver.getDnsCache().get('localhost');
      const initialIndex = entry.currentIndex;

      // Make multiple requests
      for (let i = 0; i < 3; i++) {
        await app.curl(url + '/get_headers', { dataType: 'json' });
      }

      // Index should not change when rotation is disabled
      assert.strictEqual(entry.currentIndex, initialIndex);

      // Restore original setting
      app.dnsResolver.enableAddressRotation = originalRotation;
    });

    it('should handle single address without rotation', async () => {
      // Mock lookup to return single address
      mm(app.dnsResolver.lookupPromises, 'lookup', async (hostname, options) => {
        if (options && options.all) {
          return [{ address: '127.0.0.1', family: 4 }];
        }
        return { address: '127.0.0.1', family: 4 };
      });

      await app.curl(url + '/get_headers', { dataType: 'json' });

      const entry = app.dnsResolver.getDnsCache().get('localhost');
      assert(entry);
      assert.strictEqual(entry.records.length, 1);

      // Multiple curl requests should work fine with single address
      for (let i = 0; i < 3; i++) {
        const result = await app.curl(url + '/get_headers', { dataType: 'json' });
        assert.strictEqual(result.status, 200);
      }
    });

    it('should rotate through all addresses cyclically', async () => {
      // Mock lookup to return 3 addresses
      mm(app.dnsResolver.lookupPromises, 'lookup', async (hostname, options) => {
        if (options && options.all) {
          return [
            { address: '127.0.0.1', family: 4 },
            { address: '127.0.0.2', family: 4 },
            { address: '127.0.0.3', family: 4 },
          ];
        }
        return { address: '127.0.0.1', family: 4 };
      });

      // First request to populate cache
      await app.curl(url + '/get_headers', { dataType: 'json' });

      const entry = app.dnsResolver.getDnsCache().get('localhost');
      const indices = [ entry.currentIndex ];

      // Make 6 requests (2 full cycles) and record the index after each
      for (let i = 0; i < 6; i++) {
        try {
          await app.curl(url + '/get_headers', { dataType: 'json', timeout: 1000 });
        } catch (error) {
          console.error('Expected curl error due to mock servers not running:', error.message);
        }
        indices.push(entry.currentIndex);
      }

      // Verify cyclic pattern: after each request, index advances
      // Starting from 0: after req1->1, req2->2, req3->0, req4->1, req5->2, req6->0
      assert.strictEqual(indices[0], 1); // after 1st request
      assert.strictEqual(indices[1], 2); // after 2nd request
      assert.strictEqual(indices[2], 0); // after 3rd request (wraps around)
      assert.strictEqual(indices[3], 1); // after 4th request
      assert.strictEqual(indices[4], 2); // after 5th request
      assert.strictEqual(indices[5], 0); // after 6th request (wraps around again)
    });
  });
});
