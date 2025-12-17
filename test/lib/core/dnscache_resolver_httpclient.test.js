const mm = require('egg-mock');
const assert = require('assert');
const urlparse = require('url').parse;
const utils = require('../../utils');

const mockResolve4Promise = app => {
  mm(app.dnsResolver.resolverPromises, 'resolve4', async (hostname, options) => {
    // When called with {ttl: true}, return array of objects with address and ttl
    if (options && options.ttl) {
      return [{ address: '127.0.0.1', ttl: 3 }];
    }
    // Otherwise return array of strings
    return [{ address: '127.0.0.1' }];
  });
};

describe('test/lib/core/dnscache_resolver_httpclient.test.js', () => {
  let app;
  let url;
  let host;
  let originalDNSServers;

  before(async () => {
    app = utils.app('apps/dnscache_resolver_httpclient');
    await app.ready();
    app.httpclient; // initialize dnsResolver
    url = await utils.startLocalServer();
    url = url.replace('127.0.0.1', 'localhost');
    host = urlparse(url).host;
    originalDNSServers = app.dnsResolver.resolver.getServers();
  });

  afterEach(() => {
    app.dnsResolver.resetCache();
    mm.restore();
    app.dnsResolver.resolver.setServers(originalDNSServers);
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
   * calling `dns.resolve()`.
   *
   * To make sure that your domain exists or not, just use `ping your_domain_here` instead.
   */
  it('should throw error when the first dns resolve fail', async () => {
    if (!process.env.CI) {
      app.dnsResolver.resolver.setServers([
        '223.5.5.5',
        '223.6.6.6',
      ]);
    }
    await app.httpRequest()
      .get('/?url=' + encodeURIComponent('http://notexists-1111111local-domain.com'))
      .expect(500)
      .expect(/queryA ENOTFOUND notexists-1111111local-domain\.com/);
  });

  it('should use local cache dns result when dns resolve error', async () => {
    mockResolve4Promise(app);
    await app.httpRequest()
      .get('/?url=' + encodeURIComponent(url + '/get_headers'))
      .expect(200)
      .expect(/"host":"localhost:\d+"/);
    // mock local cache expires and mock dns resolve throw error
    const entry = app.dnsResolver.getDnsCache().get('localhost');
    if (!entry || !entry.records || !entry.records[0]) {
      throw new Error('No cache record found after first request!');
    }
    entry.records[0].timestamp = 0;
    mm.error(app.dnsResolver.resolverPromises, 'resolve4', 'mock dns resolve error');
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

  it('should app.curl work on resolve error', async () => {
    const result = await app.curl(url + '/get_headers', { dataType: 'json' });
    assert(result.status === 200);
    assert(result.data.host === host);

    // mock local cache expires and mock dns resolve throw error
    const entry = app.dnsResolver.getDnsCache().get('localhost');
    entry.records[0].timestamp = 0;
    mm.error(app.dnsResolver.resolverPromises, 'resolve4', 'mock dns resolve error');
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

    mockResolve4Promise(app);

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
    mockResolve4Promise(app);

    let obj = urlparse(url + '/get_headers');
    let result = await app.curl(obj, { dataType: 'json' });
    assert(result.status === 200);
    assert(result.data.host === host);

    let record = app.dnsResolver.getCacheRecord('localhost');
    assert(record);
    const timestamp = record.timestamp;

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
    mockResolve4Promise(agent);

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

  it('should support address rotation', async () => {
    // Mock multiple IP addresses
    mm(app.dnsResolver.resolverPromises, 'resolve4', async (hostname, options) => {
      if (options && options.ttl) {
        return [
          { address: '127.0.0.1', ttl: 60 },
          { address: '127.0.0.2', ttl: 60 },
          { address: '127.0.0.3', ttl: 60 },
        ];
      }
      return [ '127.0.0.1', '127.0.0.2', '127.0.0.3' ];
    });

    // First request should use first IP and cache all IPs
    const obj = urlparse(url + '/get_headers');
    await app.curl(obj, { dataType: 'json' });

    const entry = app.dnsResolver.getDnsCache().get('localhost');
    assert(entry);
    assert(entry.records.length === 3);
    assert(entry.records[0].ip === '127.0.0.1');
    assert(entry.records[1].ip === '127.0.0.2');
    assert(entry.records[2].ip === '127.0.0.3');

    // Verify rotation is working if enabled
    if (app.dnsResolver.enableAddressRotation) {
      const initialIndex = entry.currentIndex;
      await app.curl(obj, { dataType: 'json' });
      const entryAfter = app.dnsResolver.getDnsCache().get('localhost');
      assert(entryAfter.currentIndex === (initialIndex + 1) % 3);
    }
  });


  it('disable DNSCache in one request should work', async () => {
    mockResolve4Promise(app);
    await app.httpRequest()
      .get('/?disableDNSCache=true&url=' + encodeURIComponent(url + '/get_headers'))
      .expect(200)
      .expect(/"host":"localhost:\d+"/);
    assert(app.dnsResolver.getDnsCache().size === 0);

    await app.httpRequest()
      .get('/?disableDNSCache=false&url=' + encodeURIComponent(url + '/get_headers'))
      .expect(200)
      .expect(/"host":"localhost:\d+"/);
    assert(app.dnsResolver.getDnsCache().size === 1);
  });

});
