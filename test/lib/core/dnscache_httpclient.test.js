'use strict';

const mm = require('egg-mock');
const assert = require('assert');
const dns = require('mz/dns');
const urlparse = require('url').parse;
const utils = require('../../utils');

describe('test/lib/core/dnscache_httpclient.test.js', () => {
  let app;
  let url;
  let host;

  before(async () => {
    app = utils.app('apps/dnscache_httpclient');
    await app.ready();
    url = await utils.startLocalServer();
    url = url.replace('127.0.0.1', 'localhost');
    host = urlparse(url).host;
  });

  afterEach(mm.restore);

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

  it('should throw error when the first dns lookup fail', async () => {
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

  it('should callback style work', done => {
    app.httpclient.curl(url + '/get_headers', (err, data, res) => {
      data = JSON.parse(data);
      assert(res.status === 200);
      assert(data.host === host);
      done();
    });
  });

  it('should callback style work on domain not exists', done => {
    app.httpclient.curl('http://notexists-1111111local-domain.com', err => {
      assert(err);
      assert(err.code === 'ENOTFOUND');
      done();
    });
  });

  it('should thunk style work', done => {
    app.httpclient.requestThunk(url + '/get_headers')((err, result) => {
      assert(!err);
      const data = JSON.parse(result.data);
      assert(result.res.status === 200);
      assert(data.host === host);
      done();
    });
  });

  it('should thunk style work on domain not exists', done => {
    app.httpclient.requestThunk('http://notexists-1111111local-domain.com')(err => {
      assert(err);
      assert(err.code === 'ENOTFOUND');
      done();
    });
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
    mm(dns, 'lookup', async () => [ '127.0.0.1' ]);

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

  it('should not cache ip', async () => {
    const obj = urlparse(url.replace('localhost', '127.0.0.1') + '/get_headers');
    const result = await app.curl(obj, { dataType: 'json' });
    assert(result.status === 200);
    assert(result.data.host === obj.host);
    assert(!app.httpclient.dnsCache.get('127.0.0.1'));
  });
});
