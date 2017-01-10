'use strict';

const mm = require('egg-mock');
const urllib = require('urllib');
const request = require('supertest');
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
      it('should return host with port', function* () {
        mm(req.header, 'host', 'foo.com:3000');
        req.hostname.should.equal('foo.com');
      });

      it('should return "" when no host present', function* () {
        req.host.should.be.a.String;
        req.host.should.equal('');
      });

      it('should return host from X-Forwarded-Host header', function* () {
        mm(req.header, 'x-forwarded-host', 'foo.com');
        req.host.should.be.a.String;
        req.host.should.equal('foo.com');
      });

      it('should return host from Host header when proxy=false', function* () {
        mm(app.config, 'proxy', false);
        mm(req.header, 'x-forwarded-host', 'foo.com');
        mm(req.header, 'host', 'bar.com');
        req.host.should.be.a.String;
        req.host.should.equal('bar.com');
      });
    });

    describe('req.hostname', () => {
      it('should return hostname with port', function* () {
        mm(req.header, 'host', 'foo.com:3000');
        req.hostname.should.equal('foo.com');
      });

      it('should return "" when no host present', function* () {
        req.hostname.should.be.a.String;
        req.hostname.should.equal('');
      });
    });

    describe('req.ip', () => {
      it('should return ipv4', function* () {
        mm(req.socket, 'remoteAddress', '::ffff:127.0.0.1');
        req.ip.should.equal('127.0.0.1');
        req.ip.should.equal('127.0.0.1');
      });
    });

    describe('req.ips', () => {
      it('should used x-forwarded-for', function* () {
        mm(req.header, 'x-forwarded-for', '127.0.0.1,127.0.0.2');
        req.ips.should.eql([ '127.0.0.1', '127.0.0.2' ]);
      });

      it('should used x-real-ip', function* () {
        mm(app.config, 'ipHeaders', 'X-Forwarded-For, X-Real-IP');
        mm(req.header, 'x-forwarded-for', '');
        mm(req.header, 'x-real-ip', '127.0.0.1,127.0.0.2');
        req.ips.should.eql([ '127.0.0.1', '127.0.0.2' ]);
      });

      it('should return []', function* () {
        mm(req.header, 'x-forwarded-for', '');
        mm(req.header, 'x-real-ip', '');
        req.ips.should.eql([]);
      });

      it('should return [] when proxy=false', function* () {
        mm(app.config, 'proxy', false);
        mm(req.header, 'x-forwarded-for', '127.0.0.1,127.0.0.2');
        req.ips.should.eql([]);
      });
    });

    describe('req.protocol', () => {

      it('should return http when it not config and no protocol header', () => {
        mm(app.config, 'protocol', null);
        return request(app.callback())
          .get('/protocol')
          .expect('http');
      });

      it('should return value of X-Custom-Proto', () => {
        mm(app.config, 'protocolHeaders', 'X-Forwarded-Proto, X-Custom-Proto');
        return request(app.callback())
          .get('/protocol')
          .set('X-Custom-Proto', 'https')
          .expect('https');
      });

      it('should ignore X-Client-Scheme', () => {
        mm(app.config, 'protocolHeaders', 'X-Forwarded-Proto');
        return request(app.callback())
          .get('/protocol')
          .set('X-Client-Scheme', 'https')
          .expect('http');
      });

      it('should return value of X-Forwarded-Proto', () => {
        return request(app.callback())
          .get('/protocol')
          .set('x-forwarded-proto', 'https')
          .expect('https');
      });

      it('should ignore X-Forwarded-Proto when proxy=false', () => {
        mm(app.config, 'proxy', false);
        return request(app.callback())
          .get('/protocol')
          .set('x-forwarded-proto', 'https')
          .expect('http');
      });

      it('should ignore X-Forwarded-Proto', () => {
        mm(app.config, 'protocolHeaders', '');
        return request(app.callback())
          .get('/protocol')
          .set('x-forwarded-proto', 'https')
          .expect('http');
      });

      it('should return value from config', () => {
        mm(app.config, 'protocol', 'https');
        return request(app.callback())
          .get('/protocol')
          .expect('https');
      });
    });

    describe('this.query[key] => String', () => {
      function expectQuery(querystring, query) {
        mm(req, 'querystring', querystring);
        req.query.should.eql(query);
        mm.restore();
      }

      it('should get string value', () => {
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
        req.queries.should.eql(query);
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

        // a[][] 这种不支持自动变化为 a
        expectQueries('a[][]=&a[][]=b', { 'a[][]': [ '', 'b' ] });
        expectQueries('a][]=&a][]=b', { 'a][]': [ '', 'b' ] });
        expectQueries('a[[]=&a[[]=b', { 'a[[]': [ '', 'b' ] });
        expectQueries('[]=&[]=b', { '[]': [ '', 'b' ] });

        // a[], a 混搭的时候，只返回最后一个 a 的值
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
        req.query.should.eql({ a: 'c' });
        req.query = {};
        req.query.should.eql({});
        req.querystring.should.equal('');

        req.query = { foo: 'bar' };
        req.query.should.eql({ foo: 'bar' });
        req.querystring.should.equal('foo=bar');

        req.query = { array: [ 1, 2 ] };
        req.query.should.eql({ array: '1' });
        req.querystring.should.equal('array=1&array=2');
      });
    });

    describe('request.acceptJSON', () => {
      it('should true when isAjax', function* () {
        mm(req.req.headers, 'x-requested-with', 'XMLHttpRequest');
        req.acceptJSON.should.equal(true);
      });

      it('should true when response is json', function* () {
        const context = app.mockContext({
          headers: {
            accept: 'text/html',
          },
          url: '/',
        });
        context.type = 'json';
        context.request.acceptJSON.should.equal(true);
      });

      it('should true when accept json', function* () {
        const context = app.mockContext({
          headers: {
            accept: 'application/json',
          },
          url: '/',
        });
        context.request.acceptJSON.should.equal(true);
      });

      it('should false when do not accept json', function* () {
        const context = app.mockContext({
          headers: {
            accept: 'text/html',
          },
          url: '/',
        });
        const request = context.request;
        request.acceptJSON.should.equal(false);
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
        body.should.eql({
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
        body.should.eql({
          query: { p: 'a,b', 'a[foo]': 'bar' },
          queries: { p: [ 'a,b', 'b,c' ], 'a[foo]': [ 'bar' ] },
        });
        done(err);
      });
    });
  });

});
