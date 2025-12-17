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

describe('test/lib/core/dnscache_fetch.test.js', () => {
  let app;
  let url;
  let host;
  let originalDNSServers;

  before(async () => {
    app = utils.app('apps/dnscache_fetch');
    await app.ready();
    // Initialize fetch to create dnsResolver
    app.fetch;
    url = await utils.startLocalServer();
    url = url.replace('127.0.0.1', 'localhost');
    host = urlparse(url).host;
    originalDNSServers = dns.getServers();
  });

  afterEach(async () => {
    app.dnsResolver.resetCache();
    mm.restore();
    dns.setServers(originalDNSServers);

    // cannot disable keepalive connection for fetch, wait for a while
    await utils.sleep(3000);
  });

  it('should fetch work and set host', async () => {
    const result = await app.fetch(url + '/get_headers');
    assert(result.status === 200);
    const data = await result.json();
    assert(/localhost:\d+/.test(data.host));
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
    try {
      await app.fetch('http://notexists-1111111local-domain.com');
      assert.fail('Should have thrown an error');
    } catch (err) {
      // Fetch API wraps DNS errors in a TypeError with the actual error in err.cause
      assert(err instanceof TypeError);
      assert.strictEqual(err.message, 'fetch failed');
      assert(err.cause);
      assert.strictEqual(err.cause.code, 'ENOTFOUND');
      assert(err.cause.message.includes('getaddrinfo ENOTFOUND notexists-1111111local-domain.com'));
    }
  });

  it('should use local cache dns result when dns lookup error', async () => {
    mockLookupPromise(app);
    let result = await app.fetch(url + '/get_headers');
    assert(result.status === 200);
    const data = await result.json();
    assert(/localhost:\d+/.test(data.host));

    utils.sleep(5000);

    // mock local cache expires and mock dns lookup throw error
    app.dnsResolver.getCacheRecord('localhost').timestamp = 0;
    mm.error(app.dnsResolver.lookupPromises, 'lookup', 'mock dns lookup error');
    result = await app.fetch(url + '/get_headers');
    assert(result.status === 200);
    const data2 = await result.json();
    assert(/localhost:\d+/.test(data2.host));
  });

  it('should fetch work on lookup error', async () => {
    const result = await app.fetch(url + '/get_headers');
    assert(result.status === 200);
    const data = await result.json();
    assert(data.host === host);

    // mock local cache expires and mock dns lookup throw error
    app.dnsResolver.getCacheRecord('localhost').timestamp = 0;
    mm.error(app.dnsResolver.lookupPromises, 'lookup', 'mock dns lookup error');
    const result2 = await app.fetch(url + '/get_headers');
    assert(result2.status === 200);
    const data2 = await result2.json();
    assert(data2.host === host);
  });

  it('should cache and update', async () => {
    mockLookupPromise(app);

    let result = await app.fetch(url + '/get_headers');
    assert(result.status === 200);
    const data = await result.json();
    assert(data.host === host);
    let record = app.dnsResolver.getCacheRecord('localhost');
    const timestamp = record.timestamp;
    assert(record);

    result = await app.fetch(url + '/get_headers');
    assert(result.status === 200);
    const data2 = await result.json();
    assert(data2.host === host);
    record = app.dnsResolver.getCacheRecord('localhost');

    assert(timestamp === record.timestamp);

    await utils.sleep(3500); // should be longer than dnsCacheLookupInterval to trigger update
    result = await app.fetch(url + '/get_headers');
    assert(result.status === 200);
    const data3 = await result.json();
    assert(data3.host === host);
    record = app.dnsResolver.getCacheRecord('localhost');

    assert(timestamp !== record.timestamp);
  });

  it('should not cache ip', async () => {
    const result = await app.fetch(url.replace('localhost', '127.0.0.1') + '/get_headers');
    assert(result.status === 200);
    const data = await result.json();
    assert(data.host === url.replace('localhost', '127.0.0.1').replace('http://', ''));
    assert(!app.dnsResolver.getCacheRecord('127.0.0.1'));
  });
});
