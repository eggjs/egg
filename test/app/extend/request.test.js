'use strict';

const assert = require('assert');
const mm = require('egg-mock');
const urllib = require('urllib');
const utils = require('../../utils');

describe('test/app/extend/request.test.js', () => {
  describe('normal', () => {
    let app;
    let ctx;
    let req;
    before(() => {
      app = utils.app('apps/demo');
      return app.ready();
    });
    after(() => app.close());
    beforeEach(() => {
      ctx = app.mockContext();
      req = ctx.request;
    });
    afterEach(mm.restore);

    describe('req.host', () => {
      it('should return host with port', () => {
        mm(req.header, 'host', 'foo.com:3000');
        assert(req.hostname === 'foo.com');
      });

      it('should return "" when no host present', () => {
        assert(typeof req.host === 'string');
        assert(req.host === '');
      });

      it('should not allow X-Forwarded-Host header', () => {
        mm(app.config, 'proxy', true);
        mm(req.header, 'x-forwarded-host', 'foo.com');
        mm(req.header, 'host', 'bar.com');
        assert(typeof req.host === 'string');
        assert(req.host === 'bar.com');
      });

      it('should return host from Host header when proxy=false', () => {
        mm(app.config, 'proxy', false);
        mm(req.header, 'x-forwarded-host', 'foo.com');
        mm(req.header, 'host', 'bar.com');
        assert(typeof req.host === 'string');
        assert(req.host === 'bar.com');
      });

      it('should custom hostHeaders', () => {
        mm(app.config, 'proxy', true);
        mm(app.config, 'hostHeaders', 'x-forwarded-host');
        mm(req.header, 'x-forwarded-host', 'foo.com');
        mm(req.header, 'host', 'bar.com');
        assert(typeof req.host === 'string');
        assert(req.host === 'foo.com');
      });
    });

    describe('req.hostname', () => {
      it('should return hostname with port', () => {
        mm(req.header, 'host', 'foo.com:3000');
        assert(req.hostname === 'foo.com');
      });

      it('should return "" when no host present', () => {
        assert(typeof req.hostname === 'string');
        assert(req.hostname === '');
      });
    });

    describe('req.ip', () => {
      it('should return ipv4', () => {
        mm(req.socket, 'remoteAddress', '::ffff:127.0.0.1');
        assert(req.ip === '127.0.0.1');
        assert(req.ip === '127.0.0.1');
      });

      it('should work with proxy', () => {
        mm(req.socket, 'remoteAddress', '::ffff:127.0.0.1');
        mm(req.header, 'x-forwarded-for', '127.0.0.1, 127.0.0.2, 127.0.0.3');
        mm(app.config, 'proxy', true);
        mm(app.config, 'maxProxyCount', 1);
        assert(req.ip === '127.0.0.2');
      });
    });

    describe('req.ips', () => {
      it('should used x-forwarded-for', () => {
        mm(req.header, 'x-forwarded-for', '127.0.0.1,127.0.0.2,127.0.0.3');
        assert.deepEqual(req.ips, [ '127.0.0.1', '127.0.0.2', '127.0.0.3' ]);
      });

      it('should used work with maxProxyCount', () => {
        mm(req.header, 'x-forwarded-for', '127.0.0.1,127.0.0.2,127.0.0.3');
        mm(app.config, 'maxProxyCount', 1);
        assert.deepEqual(req.ips, [ '127.0.0.2', '127.0.0.3' ]);
      });

      it('should used work with maxIpsCount', () => {
        mm(req.header, 'x-forwarded-for', '127.0.0.1,127.0.0.2,127.0.0.3');
        mm(app.config, 'maxIpsCount', 1);
        assert.deepEqual(req.ips, [ '127.0.0.3' ]);
      });

      it('should used x-real-ip', () => {
        mm(app.config, 'ipHeaders', 'X-Forwarded-For, X-Real-IP');
        mm(req.header, 'x-forwarded-for', '');
        mm(req.header, 'x-real-ip', '127.0.0.1,127.0.0.2');
        assert.deepEqual(req.ips, [ '127.0.0.1', '127.0.0.2' ]);
      });

      it('should return []', () => {
        mm(req.header, 'x-forwarded-for', '');
        mm(req.header, 'x-real-ip', '');
        assert.deepEqual(req.ips, []);
      });

      it('should return [] when proxy=false', () => {
        mm(app.config, 'proxy', false);
        mm(req.header, 'x-forwarded-for', '127.0.0.1,127.0.0.2');
        assert.deepEqual(req.ips, []);
      });
    });

    describe('req.protocol', () => {
      it('should return http when it not config and no protocol header', () => {
        mm(app.config, 'protocol', null);
        return app.httpRequest()
          .get('/protocol')
          .expect('http');
      });

      it('should return value of X-Custom-Proto', () => {
        mm(app.config, 'protocolHeaders', 'X-Forwarded-Proto, X-Custom-Proto');
        return app.httpRequest()
          .get('/protocol')
          .set('X-Custom-Proto', 'https')
          .expect('https');
      });

      it('should ignore X-Client-Scheme', () => {
        mm(app.config, 'protocolHeaders', 'X-Forwarded-Proto');
        return app.httpRequest()
          .get('/protocol')
          .set('X-Client-Scheme', 'https')
          .expect('http');
      });

      it('should return value of X-Forwarded-Proto', () => {
        return app.httpRequest()
          .get('/protocol')
          .set('x-forwarded-proto', 'https')
          .expect('https');
      });

      it('should ignore X-Forwarded-Proto when proxy=false', () => {
        mm(app.config, 'proxy', false);
        return app.httpRequest()
          .get('/protocol')
          .set('x-forwarded-proto', 'https')
          .expect('http');
      });

      it('should ignore X-Forwarded-Proto', () => {
        mm(app.config, 'protocolHeaders', '');
        return app.httpRequest()
          .get('/protocol')
          .set('x-forwarded-proto', 'https')
          .expect('http');
      });

      it('should return value from config', () => {
        mm(app.config, 'protocol', 'https');
        return app.httpRequest()
          .get('/protocol')
          .expect('https');
      });

      it('should return value from socket.encrypted', () => {
        const ctx = app.mockContext();
        ctx.request.socket.encrypted = true;
        assert(ctx.request.protocol === 'https');
      });
    });

    describe('this.query && this.queries can be modified', () => {
      it('should success with querystring present', () => {
        req.querystring = 'a=a&b=b1&b=b2';
        assert.deepEqual(req.query, { a: 'a', b: 'b1' });
        assert.deepEqual(req.queries, { a: [ 'a' ], b: [ 'b1', 'b2' ] });
        req.query.a = 'aa';
        req.queries.b = [ 'bb' ];
        assert.deepEqual(req.query, { a: 'aa', b: 'b1' });
        assert.deepEqual(req.queries, { a: [ 'a' ], b: [ 'bb' ] });
      });

      it('should success with empty querystring', () => {
        req.querystring = '';
        assert.deepEqual(req.query, {});
        assert.deepEqual(req.queries, {});
        req.query.a = 'aa';
        req.queries.b = [ 'bb' ];
        assert.deepEqual(req.query, { a: 'aa' });
        assert.deepEqual(req.queries, { b: [ 'bb' ] });
      });
    });

    describe('this.query[key] => String', () => {
      function expectQuery(querystring, query) {
        mm(req, 'querystring', querystring);
        assert.deepEqual(req.query, query);
        mm.restore();
      }

      it('should get string value', () => {
        expectQuery('=b', {});
        expectQuery('a=b', { a: 'b' });
        expectQuery('a=&', { a: '' });
        expectQuery('a=b&', { a: 'b' });
        expectQuery('a.=b', { 'a.': 'b' });
        expectQuery('a=b&a=c', { a: 'b' });
        expectQuery('a=&a=c', { a: '' });
        expectQuery('a=c&a=b', { a: 'c' });
        expectQuery('a=c&a=b&b=bb', { a: 'c', b: 'bb' });
        expectQuery('a[=c&a[=b', { 'a[': 'c' });
        expectQuery('a{=c&a{=b', { 'a{': 'c' });
        expectQuery('a[]=c&a[]=b', { 'a[]': 'c' });
        expectQuery('a[]=&a[]=b', { 'a[]': '' });
        expectQuery('a[foo]=c', { 'a[foo]': 'c' });
        expectQuery('a[foo][bar]=c', { 'a[foo][bar]': 'c' });
        expectQuery('a=', { a: '' });
        expectQuery('a[]=a&a=b&a=c', { 'a[]': 'a', a: 'b' });
      });

      it('should get undefined when key not exists', () => {
        expectQuery('a=b', { a: 'b' });
      });
    });

    describe('this.queries[key] => Array', () => {
      function expectQueries(querystring, query) {
        mm(req, 'querystring', querystring);
        assert.deepEqual(req.queries, query);
        mm.restore();
      }

      it('should get array value', () => {
        expectQueries('', { });
        expectQueries('a=', { a: [ '' ] });
        expectQueries('a=&', { a: [ '' ] });
        expectQueries('a=b&', { a: [ 'b' ] });
        expectQueries('a.=', { 'a.': [ '' ] });
        expectQueries('a=&a=&a=&a=&a=&a=&a=&a=', { a: [ '', '', '', '', '', '', '', '' ] });
        expectQueries('a=&a=&a=&a=&a=&a=&a=&a=&', { a: [ '', '', '', '', '', '', '', '' ] });
        expectQueries('a=&a=&a=&a=&a=&a=&a=&a=&&&&', { a: [ '', '', '', '', '', '', '', '' ] });
        expectQueries('a=b', { a: [ 'b' ] });
        expectQueries('a={}', { a: [ '{}' ] });
        expectQueries('a=[]', { a: [ '[]' ] });
        expectQueries('a[]=[]', { 'a[]': [ '[]' ], a: [ '[]' ] });
        expectQueries('a[]=&a[]=', { 'a[]': [ '', '' ], a: [ '', '' ] });
        expectQueries('a[]=[]&a[]=[]', { 'a[]': [ '[]', '[]' ], a: [ '[]', '[]' ] });
        expectQueries('a=b&a=c', { a: [ 'b', 'c' ] });
        expectQueries('a=&a=c', { a: [ '', 'c' ] });
        expectQueries('a=c&a=b', { a: [ 'c', 'b' ] });
        expectQueries('a=c&a=b&b=bb', { a: [ 'c', 'b' ], b: [ 'bb' ] });
        expectQueries('a[=c&a[=b', { 'a[': [ 'c', 'b' ] });
        expectQueries('a{=c&a{=b', { 'a{': [ 'c', 'b' ] });
        expectQueries('a[]=c&a[]=b', { 'a[]': [ 'c', 'b' ], a: [ 'c', 'b' ] });
        expectQueries('a[]=&a[]=b', { 'a[]': [ '', 'b' ], a: [ '', 'b' ] });
        expectQueries('a[]=&a[]=b&a=foo', { 'a[]': [ '', 'b' ], a: [ 'foo' ] });
        expectQueries('a=bar&a[]=&a[]=b&a=foo', { 'a[]': [ '', 'b' ], a: [ 'bar', 'foo' ] });

        // 'a[][]' doesn't support converting to 'a'
        expectQueries('a[][]=&a[][]=b', { 'a[][]': [ '', 'b' ] });
        expectQueries('a][]=&a][]=b', { 'a][]': [ '', 'b' ] });
        expectQueries('a[[]=&a[[]=b', { 'a[[]': [ '', 'b' ] });
        expectQueries('[]=&[]=b', { '[]': [ '', 'b' ] });

        // 'a[]' only returns the last value when mixed with others
        expectQueries('a[]=a&a=b&a=c', { 'a[]': [ 'a' ], a: [ 'b', 'c' ] });

        // object
        expectQueries('a[foo]=c', { 'a[foo]': [ 'c' ] });
        expectQueries('a[foo]=c&a=b', { 'a[foo]': [ 'c' ], a: [ 'b' ] });
        expectQueries('a[foo]=c&a=b&b=bb&d=d1&d=d2', {
          'a[foo]': [ 'c' ],
          a: [ 'b' ],
          b: [ 'bb' ],
          d: [ 'd1', 'd2' ],
        });
        expectQueries('a[foo]=c&a[]=b&a[]=d', {
          'a[foo]': [ 'c' ],
          'a[]': [ 'b', 'd' ],
          a: [ 'b', 'd' ],
        });
        expectQueries('a[foo]=c&a[]=b&a[]=d&c=cc&c=c2&c=', {
          'a[foo]': [ 'c' ],
          'a[]': [ 'b', 'd' ],
          a: [ 'b', 'd' ],
          c: [ 'cc', 'c2', '' ],
        });
        expectQueries('a[foo][bar]=c', {
          'a[foo][bar]': [ 'c' ],
        });
      });

      it('should get undefined when key not exists', () => {
        expectQueries('a=b', { a: [ 'b' ] });
      });
    });

    describe('this.query = obj', () => {
      it('should set query with object', () => {
        mm(req, 'querystring', 'a=c');
        assert.deepEqual(req.query, { a: 'c' });
        req.query = {};
        assert.deepEqual(req.query, {});
        assert(req.querystring === '');

        req.query = { foo: 'bar' };
        assert.deepEqual(req.query, { foo: 'bar' });
        assert(req.querystring === 'foo=bar');

        req.query = { array: [ 1, 2 ] };
        assert.deepEqual(req.query, { array: '1' });
        assert(req.querystring === 'array=1&array=2');
      });
    });

    describe('request.acceptJSON', () => {
      it('should true when url path ends with .json', async () => {
        mm(req, 'path', 'hello.json');
        assert(req.acceptJSON === true);
      });

      it('should true when response is json', async () => {
        const context = app.mockContext({
          headers: {
            accept: 'text/html',
          },
          url: '/',
        });
        context.type = 'application/json';
        assert(context.request.acceptJSON === true);
      });

      it('should true when accept json', async () => {
        const context = app.mockContext({
          headers: {
            accept: 'application/json',
          },
          url: '/',
        });
        assert(context.request.acceptJSON === true);
      });

      it('should false when do not accept json', async () => {
        const context = app.mockContext({
          headers: {
            accept: 'text/html',
          },
          url: '/',
        });
        const request = context.request;
        assert(request.acceptJSON === false);
      });
    });
  });

  describe('work with egg app', () => {
    let app;
    let host;
    before(() => {
      app = utils.app('apps/querystring-extended');
      return app.ready();
    });
    before(done => {
      app.listen(0, function() {
        host = `http://127.0.0.1:${this.address().port}`;
        done();
      });
    });
    after(() => app.close());

    it('should return query and queries', done => {
      urllib.request(`${host}/?p=a,b&p=b,c&a[foo]=bar`, {
        dataType: 'json',
      }, (err, body) => {
        assert.deepEqual(body, {
          query: { p: 'a,b', 'a[foo]': 'bar' },
          queries: { p: [ 'a,b', 'b,c' ], 'a[foo]': [ 'bar' ] },
        });
        done(err);
      });
    });

    it('should work with encodeURIComponent', done => {
      urllib.request(`${host}/?p=a,b&p=b,c&${encodeURIComponent('a[foo]')}=bar`, {
        dataType: 'json',
      }, (err, body) => {
        assert.deepEqual(body, {
          query: { p: 'a,b', 'a[foo]': 'bar' },
          queries: { p: [ 'a,b', 'b,c' ], 'a[foo]': [ 'bar' ] },
        });
        done(err);
      });
    });
  });
});
