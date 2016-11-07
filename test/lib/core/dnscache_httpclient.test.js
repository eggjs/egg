'use strict';

const mm = require('egg-mock');
const request = require('supertest');
const assert = require('assert');
const dns = require('dns');
const urlparse = require('url').parse;
const utils = require('../../utils');

describe('test/lib/core/dnscache_httpclient.test.js', () => {
  let app;
  let url;

  before(function* () {
    app = utils.app('apps/dnscache_httpclient');
    yield app.ready();
    url = yield utils.startLocalServer();
    url = url.replace('127.0.0.1', 'localhost');
  });

  afterEach(mm.restore);

  it('should ctx.curl work and set host', function* () {
    yield request(app.callback())
      .get('/?url=' + encodeURIComponent(url + '/get_headers'))
      .expect(200)
      .expect(/"host":"localhost"/);
    yield request(app.callback())
      .get('/?url=' + encodeURIComponent(url + '/get_headers') + '&host=localhost.foo.com')
      .expect(200)
      .expect(/"host":"localhost\.foo\.com"/);
    yield request(app.callback())
      .get('/?url=' + encodeURIComponent(url + '/get_headers') + '&Host=localhost2.foo.com')
      .expect(200)
      .expect(/"host":"localhost2\.foo\.com"/);
  });

  it('should throw error when the first dns lookup fail', function* () {
    yield request(app.callback())
      .get('/?url=' + encodeURIComponent('http://notexists-1111111local-domain.com'))
      .expect(500)
      .expect(/getaddrinfo ENOTFOUND notexists-1111111local-domain\.com/);
  });

  it('should use local cache dns result when dns lookup error', function* () {
    yield request(app.callback())
      .get('/?url=' + encodeURIComponent(url + '/get_headers'))
      .expect(200)
      .expect(/"host":"localhost"/);
    // mock local cache expires and mock dns lookup throw error
    app.urllib.dnsCache.get('localhost').timestamp = 0;
    mm.error(dns, 'lookup', 'mock dns lookup error');
    yield request(app.callback())
      .get('/?url=' + encodeURIComponent(url + '/get_headers'))
      .expect(200)
      .expect(/"host":"localhost"/);
  });

  it('should app.curl work', function* () {
    const result = yield app.curl(url + '/get_headers', { dataType: 'json' });
    assert(result.status === 200);
    assert(result.data.host === 'localhost');

    const result2 = yield app.urllib.curl(url + '/get_headers', { dataType: 'json' });
    assert(result2.status === 200);
    assert(result2.data.host === 'localhost');
  });

  it('should callback style work', done => {
    app.urllib.curl(url + '/get_headers', (err, data, res) => {
      data = JSON.parse(data);
      assert(res.status === 200);
      assert(data.host === 'localhost');
      done();
    });
  });

  it('should callback style work on domain not exists', done => {
    app.urllib.curl('http://notexists-1111111local-domain.com', err => {
      assert(err);
      assert(err.code === 'ENOTFOUND');
      done();
    });
  });

  it('should thunk style work', done => {
    app.urllib.requestThunk(url + '/get_headers')((err, result) => {
      assert(!err);
      const data = JSON.parse(result.data);
      assert(result.res.status === 200);
      assert(data.host === 'localhost');
      done();
    });
  });

  it('should thunk style work on domain not exists', done => {
    app.urllib.requestThunk('http://notexists-1111111local-domain.com')(err => {
      assert(err);
      assert(err.code === 'ENOTFOUND');
      done();
    });
  });

  it('should app.curl work on lookup error', function* () {
    const result = yield app.curl(url + '/get_headers', { dataType: 'json' });
    assert(result.status === 200);
    assert(result.data.host === 'localhost');

    // mock local cache expires and mock dns lookup throw error
    app.urllib.dnsCache.get('localhost').timestamp = 0;
    mm.error(dns, 'lookup', 'mock dns lookup error');
    const result2 = yield app.urllib.curl(url + '/get_headers', { dataType: 'json' });
    assert(result2.status === 200);
    assert(result2.data.host === 'localhost');
  });

  it('should app.curl(obj)', function* () {
    const obj = urlparse(url + '/get_headers');
    const result = yield app.curl(obj, { dataType: 'json' });
    assert(result.status === 200);
    assert(result.data.host === 'localhost');
  });

  it.skip('should ctx.curl work on remote url', function* () {
    const url = process.env.CI ? 'https://registry.npmjs.org' : 'https://r.cnpmjs.org';
    yield request(app.callback())
      .get('/?url=' + encodeURIComponent(url + '/pedding/latest'))
      .expect(200)
      .expect(/{"name":"pedding"/);
  });
});
