const mm = require('egg-mock');
const assert = require('assert');
const dns = require('dns').promises;
const urlparse = require('url').parse;
const utils = require('../../utils');

describe('test/lib/core/dnscache_httpclient.test.js', () => {
  let app;
  let url;
  let host;
  let originalDNSServers;

  before(async () => {
    app = utils.app('apps/dnscache_httpclient');
    await app.ready();
    url = await utils.startLocalServer();
    url = url.replace('127.0.0.1', 'localhost');
    host = urlparse(url).host;
    originalDNSServers = dns.getServers();
  });

  afterEach(mm.restore);
  afterEach(() => {
    // After trying to set Server Ips forcely,
    // try to restore them to usual ones
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
    await app.httpRequest()
      .get('/?url=' + encodeURIComponent(url + '/get_headers'))
      .expect(200)
      .expect(/"host":"localhost:\d+"/);
    // mock local cache expires and mock dns lookup throw error
    app.httpclient.dnsCache.get('localhost').timestamp = 0;
    mm.error(dns, 'lookup', 'mock dns lookup error');
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
    app.httpclient.dnsCache.get('localhost').timestamp = 0;
    mm.error(dns, 'lookup', 'mock dns lookup error');
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
    mm(dns, 'lookup', async () => {
      return { address: '127.0.0.1', family: 4 };
    });

    // reset lru cache
    mm(app.httpclient.dnsCache, 'max', 1);
    mm(app.httpclient.dnsCache, 'size', 0);
    mm(app.httpclient.dnsCache, 'cache', new Map());
    mm(app.httpclient.dnsCache, '_cache', new Map());

    let obj = urlparse(url + '/get_headers');
    let result = await app.curl(obj, { dataType: 'json' });
    assert(result.status === 200);
    assert(result.data.host === host);

    assert(app.httpclient.dnsCache.get('localhost'));

    obj = urlparse(url.replace('localhost', 'another.com') + '/get_headers');
    result = await app.curl(obj, { dataType: 'json' });
    assert(result.status === 200);
    assert(result.data.host === obj.host);

    assert(!app.httpclient.dnsCache.get('localhost'));
    assert(app.httpclient.dnsCache.get('another.com'));
  });

  it('should cache and update', async () => {
    mm(dns, 'lookup', async () => {
      return { address: '127.0.0.1', family: 4 };
    });

    let obj = urlparse(url + '/get_headers');
    let result = await app.curl(obj, { dataType: 'json' });
    assert(result.status === 200);
    assert(result.data.host === host);
    let record = app.httpclient.dnsCache.get('localhost');
    const timestamp = record.timestamp;
    assert(record);

    obj = urlparse(url + '/get_headers');
    result = await app.curl(obj, { dataType: 'json' });
    assert(result.status === 200);
    assert(result.data.host === host);
    record = app.httpclient.dnsCache.get('localhost');
    assert(timestamp === record.timestamp);

    await utils.sleep(5500);
    obj = urlparse(url + '/get_headers');
    result = await app.curl(obj, { dataType: 'json' });
    assert(result.status === 200);
    assert(result.data.host === host);
    record = app.httpclient.dnsCache.get('localhost');
    assert(timestamp !== record.timestamp);
  });

  it('should cache and update with agent', async () => {
    const agent = app._agent;
    mm(dns, 'lookup', async () => {
      return { address: '127.0.0.1', family: 4 };
    });

    let obj = urlparse(url + '/get_headers');
    let result = await agent.curl(obj, { dataType: 'json' });
    assert(result.status === 200);
    assert(result.data.host === host);
    let record = agent.httpclient.dnsCache.get('localhost');
    const timestamp = record.timestamp;
    assert(record);

    obj = urlparse(url + '/get_headers');
    result = await agent.curl(obj, { dataType: 'json' });
    assert(result.status === 200);
    assert(result.data.host === host);
    record = agent.httpclient.dnsCache.get('localhost');
    assert(timestamp === record.timestamp);

    await utils.sleep(5500);
    obj = urlparse(url + '/get_headers');
    result = await agent.curl(obj, { dataType: 'json' });
    assert(result.status === 200);
    assert(result.data.host === host);
    record = agent.httpclient.dnsCache.get('localhost');
    assert(timestamp !== record.timestamp);
  });

  it('should not cache ip', async () => {
    const obj = urlparse(url.replace('localhost', '127.0.0.1') + '/get_headers');
    const result = await app.curl(obj, { dataType: 'json' });
    assert(result.status === 200);
    assert(result.data.host === obj.host);
    assert(!app.httpclient.dnsCache.get('127.0.0.1'));
  });

  describe('disable DNSCache in one request', () => {
    beforeEach(() => {
      mm(app.httpclient.dnsCache, 'size', 0);
    });

    it('should work', async () => {
      await app.httpRequest()
        .get('/?disableDNSCache=true&url=' + encodeURIComponent(url + '/get_headers'))
        .expect(200)
        .expect(/"host":"localhost:\d+"/);

      assert(app.httpclient.dnsCache.size === 0);
    });
  });
});
