'use strict';

const mm = require('egg-mock');
const should = require('should');
const merge = require('merge-descriptors');
const urllib = require('urllib');
const request = require('supertest');
const utils = require('../../utils');
const requestExt = require('../../../app/extend/request');

describe('test/app/extend/request.test.js', () => {
  afterEach(mm.restore);

  describe('req.host', () => {
    it('should return host with port', function* () {
      const req = yield utils.createRequest();
      req.header.host = 'foo.com:3000';
      req.hostname.should.equal('foo.com');
    });

    it('should return "localhost" when no host present', function* () {
      const req = yield utils.createRequest();
      req.host.should.be.a.String;
      req.host.should.equal('localhost');
    });

    it('should return host from X-Forwarded-Host header', function* () {
      const req = yield utils.createRequest();
      req.header['x-forwarded-host'] = 'foo.com';
      req.host.should.be.a.String;
      req.host.should.equal('foo.com');
    });
  });

  describe('req.hostname', () => {
    it('should return hostname with port', function* () {
      const req = yield utils.createRequest();
      req.header.host = 'foo.com:3000';
      req.hostname.should.equal('foo.com');
    });

    it('should return "localhost" when no host present', function* () {
      const req = yield utils.createRequest();
      req.hostname.should.be.a.String;
      req.hostname.should.equal('localhost');
    });
  });

  describe('req.ip', () => {
    it('should return ipv4', function* () {
      const req = yield utils.createRequest();
      req.socket.remoteAddress = '::ffff:127.0.0.1';
      req.ip.should.equal('127.0.0.1');
      req.ip.should.equal('127.0.0.1');
    });
  });

  describe('req.ips', () => {
    it('should used x-forwarded-for', function* () {
      const req = yield utils.createRequest();
      req.header['x-forwarded-for'] = '127.0.0.1,127.0.0.2';
      req.ips.should.eql([ '127.0.0.1', '127.0.0.2' ]);
    });

    it('should used x-real-ip', function* () {
      const req = yield utils.createRequest();
      req.header['x-forwarded-for'] = '';
      req.header['x-real-ip'] = '127.0.0.1,127.0.0.2';
      req.ips.should.eql([ '127.0.0.1', '127.0.0.2' ]);
    });

    it('should return []', function* () {
      const req = yield utils.createRequest();
      req.header['x-forwarded-for'] = '';
      req.header['x-real-ip'] = '';
      req.ips.should.eql([]);
    });
  });

  describe('req.protocol', () => {
    let app;
    beforeEach(() => {
      app = utils.app('apps/demo');
      return app.ready();
    });
    afterEach(() => app.close());

    it('should return http when it not config and no protocol header', () => {
      mm(app.config, 'protocl', null);
      return request(app.callback())
        .get('/protocol')
        .expect('http');
    });

    it('should return value of X-Custom-Proto', () => {
      mm(app.config, 'protocolHeaders', 'X-Custom-Proto');
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
    it('should get string value', () => {
      createRequest('a=b').query.should.eql({ a: 'b' });
      createRequest('a=&').query.should.eql({ a: '' });
      createRequest('a=b&').query.should.eql({ a: 'b' });
      createRequest('a.=b').query.should.eql({ 'a.': 'b' });
      createRequest('a=b&a=c').query.should.eql({ a: 'b' });
      createRequest('a=&a=c').query.should.eql({ a: '' });
      createRequest('a=c&a=b').query.should.eql({ a: 'c' });
      createRequest('a=c&a=b&b=bb').query.should.eql({ a: 'c', b: 'bb' });
      createRequest('a[=c&a[=b').query.should.eql({ 'a[': 'c' });
      createRequest('a{=c&a{=b').query.should.eql({ 'a{': 'c' });
      createRequest('a[]=c&a[]=b').query.should.eql({ 'a[]': 'c' });
      createRequest('a[]=&a[]=b').query.should.eql({ 'a[]': '' });
      createRequest('a[foo]=c').query.should.eql({ 'a[foo]': 'c' });
      createRequest('a[foo][bar]=c').query.should.eql({ 'a[foo][bar]': 'c' });
      createRequest('a=').query.should.eql({ a: '' });
      createRequest('a[]=a&a=b&a=c').query.should.eql({ 'a[]': 'a', a: 'b' });
    });

    it('should get undefined when key not exists', () => {
      const request = createRequest('a=b');
      request.query.should.eql({ a: 'b' });
      should.not.exist(request.query.foo);
    });
  });

  describe('this.queries[key] => Array', () => {
    it('should get array value', () => {
      createRequest('').queries.should.eql({ });
      createRequest('a=').queries.should.eql({ a: [ '' ] });
      createRequest('a=&').queries.should.eql({ a: [ '' ] });
      createRequest('a=b&').queries.should.eql({ a: [ 'b' ] });
      createRequest('a.=').queries.should.eql({ 'a.': [ '' ] });
      createRequest('a=&a=&a=&a=&a=&a=&a=&a=').queries.should.eql({ a: [ '', '', '', '', '', '', '', '' ] });
      createRequest('a=&a=&a=&a=&a=&a=&a=&a=&').queries.should.eql({ a: [ '', '', '', '', '', '', '', '' ] });
      createRequest('a=&a=&a=&a=&a=&a=&a=&a=&&&&').queries.should.eql({ a: [ '', '', '', '', '', '', '', '' ] });
      createRequest('a=b').queries.should.eql({ a: [ 'b' ] });
      createRequest('a={}').queries.should.eql({ a: [ '{}' ] });
      createRequest('a=[]').queries.should.eql({ a: [ '[]' ] });
      createRequest('a[]=[]').queries.should.eql({ 'a[]': [ '[]' ], a: [ '[]' ] });
      createRequest('a[]=&a[]=').queries.should.eql({ 'a[]': [ '', '' ], a: [ '', '' ] });
      createRequest('a[]=[]&a[]=[]').queries.should.eql({ 'a[]': [ '[]', '[]' ], a: [ '[]', '[]' ] });
      createRequest('a=b&a=c').queries.should.eql({ a: [ 'b', 'c' ] });
      createRequest('a=&a=c').queries.should.eql({ a: [ '', 'c' ] });
      createRequest('a=c&a=b').queries.should.eql({ a: [ 'c', 'b' ] });
      createRequest('a=c&a=b&b=bb').queries.should.eql({ a: [ 'c', 'b' ], b: [ 'bb' ] });
      createRequest('a[=c&a[=b').queries.should.eql({ 'a[': [ 'c', 'b' ] });
      createRequest('a{=c&a{=b').queries.should.eql({ 'a{': [ 'c', 'b' ] });
      createRequest('a[]=c&a[]=b').queries.should.eql({ 'a[]': [ 'c', 'b' ], a: [ 'c', 'b' ] });
      createRequest('a[]=&a[]=b').queries.should.eql({ 'a[]': [ '', 'b' ], a: [ '', 'b' ] });
      createRequest('a[]=&a[]=b&a=foo').queries.should.eql({ 'a[]': [ '', 'b' ], a: [ 'foo' ] });
      createRequest('a=bar&a[]=&a[]=b&a=foo').queries.should.eql({ 'a[]': [ '', 'b' ], a: [ 'bar', 'foo' ] });

      // a[][] 这种不支持自动变化为 a
      createRequest('a[][]=&a[][]=b').queries.should.eql({ 'a[][]': [ '', 'b' ] });
      createRequest('a][]=&a][]=b').queries.should.eql({ 'a][]': [ '', 'b' ] });
      createRequest('a[[]=&a[[]=b').queries.should.eql({ 'a[[]': [ '', 'b' ] });
      createRequest('[]=&[]=b').queries.should.eql({ '[]': [ '', 'b' ] });

      // a[], a 混搭的时候，只返回最后一个 a 的值
      createRequest('a[]=a&a=b&a=c').queries.should.eql({ 'a[]': [ 'a' ], a: [ 'b', 'c' ] });

      // object
      createRequest('a[foo]=c').queries.should.eql({ 'a[foo]': [ 'c' ] });
      createRequest('a[foo]=c&a=b').queries.should.eql({ 'a[foo]': [ 'c' ], a: [ 'b' ] });
      createRequest('a[foo]=c&a=b&b=bb&d=d1&d=d2').queries.should.eql({
        'a[foo]': [ 'c' ],
        a: [ 'b' ],
        b: [ 'bb' ],
        d: [ 'd1', 'd2' ],
      });
      createRequest('a[foo]=c&a[]=b&a[]=d').queries.should.eql({
        'a[foo]': [ 'c' ],
        'a[]': [ 'b', 'd' ],
        a: [ 'b', 'd' ],
      });
      createRequest('a[foo]=c&a[]=b&a[]=d&c=cc&c=c2&c=').queries.should.eql({
        'a[foo]': [ 'c' ],
        'a[]': [ 'b', 'd' ],
        a: [ 'b', 'd' ],
        c: [ 'cc', 'c2', '' ],
      });
      createRequest('a[foo][bar]=c').queries.should.eql({
        'a[foo][bar]': [ 'c' ],
      });
    });

    it('should get undefined when key not exists', () => {
      const request = createRequest('a=b');
      request.queries.should.eql({ a: [ 'b' ] });
      should.not.exist(request.queries.foo);
    });
  });

  describe('this.query = obj', () => {
    it('should set query with object', () => {
      const req = createRequest('a=c');
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
      const req = yield utils.createRequest();
      mm(req.req.headers, 'x-requested-with', 'XMLHttpRequest');
      req.acceptJSON.should.equal(true);
    });

    it('should true when response is json', function* () {
      const context = yield utils.createContext({
        headers: {
          accept: 'text/html',
        },
        url: '/',
      });
      context.res._headers = {
        'content-type': 'json',
      };
      context.request.acceptJSON.should.equal(true);
    });

    it('should true when accept json', function* () {
      const context = yield utils.createContext({
        headers: {
          accept: 'application/json',
        },
        url: '/',
      });
      context.request.acceptJSON.should.equal(true);
    });

    it('should false when do not accept json', function* () {
      const request = yield utils.createRequest({
        headers: {
          accept: 'text/html',
        },
        url: '/',
      });
      request.acceptJSON.should.equal(false);
    });
  });

  describe('work with egg app', () => {
    let app;
    let host;
    before(done => {
      app = utils.app('apps/querystring-extended');
      app.listen(0, function() {
        host = `http://127.0.0.1:${this.address().port}`;
        done();
      });
    });

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

  function createRequest(querystring) {
    const app = {
      context: {},
      request: {
        querystring,
      },
    };
    merge(app.request, requestExt);
    return app.request;
  }
});
