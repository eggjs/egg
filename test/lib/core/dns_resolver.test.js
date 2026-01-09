const utils = require('../../utils');
const mm = require('egg-mock');
const dns = require('dns');
const dnsPromise = require('dns').promises;
const assert = require('assert');

describe('test/lib/core/dns_resolver.test.js', () => {
  let app;
  let url1;
  let url2;
  let server1;
  let server2;

  before(async () => {
    server1 = await utils.startNewLocalServer('127.0.0.1');
    server2 = await utils.startNewLocalServer('127.0.0.2');
    if (!server1 || !server2) {
      throw new Error('start local server failed');
    }
    app = utils.app('apps/dns_resolver');
    await app.ready();
    url1 = server1.url;
    url1 = url1.replace('127.0.0.1', 'localhost');
    url2 = server2.url;
    url2 = url2.replace('127.0.0.2', 'localhost');
  });

  afterEach(mm.restore);

  after(() => {
    if (server1?.server?.listening) server1.server.close();
    if (server2?.server?.listening) server2.server.close();
  });

  it('should bypass dns resolve', async () => {
    const res = await app.curl(server1.url + '/get_headers', { dataType: 'json' });
    assert(res.status === 200);
  });

  it('should curl work', async () => {
    const res = await app.curl(url1 + '/get_headers', { dataType: 'json' });
    assert(res.status === 200);
  });

  it('should fetch also work', async () => {
    if (!app.fetch) {
      return;
    }
    const res = await app.fetch(url1 + '/get_headers', { dataType: 'json' });
    assert(res.status === 200);
  });

  it('should use dns custom lookup and catch error', async () => {
    try {
      if (server1?.server?.listening) await server1.server.close();
      // will resolve to 127.0.0.1
      const res = await app.curl(url1 + '/get_headers', { dataType: 'json' });
      assert(res.status !== 200);
    } catch (err) {
      assert(err);
      assert(err.message.includes('ECONNREFUSED'));
    }
  });

  it('should safeCurl also work', async () => {
    const res = await app.safeCurl(url2 + '/get_headers', { dataType: 'json' });
    assert(res.status === 200);
  });

  it('should fetch fail', async () => {
    if (!app.fetch) {
      return;
    }
    try {
      if (server1?.server?.listening) await server1.server.close();
      // will resolve to 127.0.0.1
      const res = await app.fetch(url1 + '/get_headers', { dataType: 'json' });
      assert(res.status !== 200);
    } catch (err) {
      assert(err);
      assert(err.message.includes('fetch failed'));
    }
  });

  it('should not fail even if dns.lookup fail, because lookup is overridden', async () => {
    mm.error(dnsPromise, 'lookup', 'mock dns lookup error');
    const res = await app.curl(url2 + '/get_headers', { dataType: 'json' });
    assert(res.status === 200);
  });
});

describe('test/lib/core/dns_resolver with dns error', () => {
  let server;
  let cache = new Map()
  before(async () => {
    server = await utils.startNewLocalServer('127.0.0.1');
    if (!server) {
      throw new Error('start local server failed');
    }
    app = utils.app('apps/dns_resolver');
    await app.ready();
    app.config.httpclient.lookup = function (hostname, options, callback) {
      if (cache.has(hostname)) {
        const address = cache.get(hostname);
        callback(null, address, 4);
        return;
      } else {
        dns.lookup(hostname, options, (err, address, family) => {
          if (!err) {
            cache.set(hostname, address);
            callback(null, address, family);
          } else {
            callback(err);
          }
        });
      }
    }
    url = server.url;
    url = url.replace('127.0.0.1', 'localhost');
  });

  afterEach(mm.restore);

  after(() => {
    if (server?.server?.listening) server.server.close();
  });

  it('should curl work', async () => {
    const res = await app.curl(url + '/get_headers', { dataType: 'json' });
    assert(res.status === 200);
    assert(cache.has('localhost'));
  })

  it('should cache work when dns fails', async () => {
    mm.error(dns, 'lookup', 'mock dns lookup error');
    const res = await app.curl(url + '/get_headers', { dataType: 'json' });
    assert(res.status === 200);
    assert(cache.has('localhost'));
    cache.delete('localhost');
    // should fail now
    try {
      await app.curl(url + '/get_headers', { dataType: 'json' });
    } catch (err) {
      assert(err);
      assert(err.message.includes('mock dns lookup error'));
    }
  })
})

