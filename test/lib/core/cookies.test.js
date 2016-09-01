'use strict';

const should = require('should');
const mm = require('egg-mock');
const request = require('supertest');
const utils = require('../../utils');

describe('test/lib/core/cookies.test.js', () => {
  afterEach(mm.restore);

  describe('secure = true', () => {
    let app;
    before(() => {
      app = utils.app('apps/secure-app');
      return app.ready();
    });

    after(() => app.close());

    it('should throw TypeError when set secure on not secure request', () => {
      const ctx = app.mockContext();
      (function() {
        ctx.setCookie('foo', 'bar', { secure: true });
      }).should.throw('Cannot send secure cookie over unencrypted connection');
    });

    it('should set cookie twice and not set domain when ctx.hostname=localhost', () => {
      const ctx = app.mockContext();
      ctx.set('Set-Cookie', 'foo=bar');
      ctx.setCookie('foo1', 'bar1');
      ctx.response.get('set-cookie').should.eql([
        'foo=bar',
        'foo1=bar1; path=/; httponly',
      ]);
    });

    it('should throw TypeError when set encrypt on keys not exists', () => {
      mm(app, 'keys', null);
      const ctx = app.mockContext();
      (function() {
        ctx.setCookie('foo', 'bar', {
          encrypt: true,
        });
      }).should.throw('.keys required for encrypt cookies');
    });

    it('should throw TypeError when get encrypt on keys not exists', () => {
      mm(app, 'keys', null);
      const ctx = app.mockContext();
      ctx.header.cookie = 'foo=bar';
      (function() {
        ctx.getCookie('foo', {
          encrypt: true,
        });
      }).should.throw('.keys required for encrypt cookies');
    });

    it('should not set secure when request protocol is http', done => {
      request(app.callback())
      .get('/?setCookieValue=foobar')
      .set('Host', 'demo.eggjs.org')
      .set('X-Forwarded-Proto', 'http')
      .expect('hello mock secure app')
      .expect(200, (err, res) => {
        should.not.exist(err);
        const cookie = res.headers['set-cookie'][0];
        should.exist(cookie);
        cookie.should.equal('foo-cookie=foobar; path=/; httponly');
        done();
      });
    });

    it('should set secure:true and httponly cookie', done => {
      request(app.callback())
      .get('/?setCookieValue=foobar')
      .set('Host', 'demo.eggjs.org')
      .set('X-Forwarded-Proto', 'https')
      .expect('hello mock secure app')
      .expect(200, (err, res) => {
        should.not.exist(err);
        const cookie = res.headers['set-cookie'][0];
        should.exist(cookie);
        cookie.should.equal('foo-cookie=foobar; path=/; secure; httponly');
        done();
      });
    });

    it('should set cookie with path: /cookiepath/ok', done => {
      request(app.callback())
      .get('/?cookiepath=/cookiepath/ok')
      .set('Host', 'demo.eggjs.org')
      .set('X-Forwarded-Proto', 'https')
      .expect('hello mock secure app')
      .expect(200, (err, res) => {
        should.not.exist(err);
        const cookie = res.headers['set-cookie'][0];
        should.exist(cookie);
        cookie.should.match(/^cookiepath=\/cookiepath\/ok; path=\/cookiepath\/ok; secure; httponly$/);
        done();
      });
    });

    it('should delete cookie', done => {
      request(app.callback())
      .get('/?cookiedel=true')
      .set('Host', 'demo.eggjs.org')
      .set('Cookie', 'cookiedel=true')
      .set('X-Forwarded-Proto', 'https')
      .expect('hello mock secure app')
      .expect(200, (err, res) => {
        should.not.exist(err);
        const cookie = res.headers['set-cookie'][0];
        should.exist(cookie);
        cookie.should.equal('cookiedel=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; httponly');
        const expires = cookie.match(/expires=([^;]+);/)[1];
        (new Date() > new Date(expires)).should.equal(true);
        done();
      });
    });

    it('should delete cookie with options', done => {
      request(app.callback())
      .get('/?cookiedel=true&opts=true')
      .set('Host', 'demo.eggjs.org')
      .set('Cookie', 'cookiedel=true; path=/hello; domain=eggjs.org; expires=30')
      .set('X-Forwarded-Proto', 'https')
      .expect('hello mock secure app')
      .expect(200, (err, res) => {
        const cookie = res.headers['set-cookie'][0];
        should.exist(cookie);
        cookie.should.equal('cookiedel=; path=/hello; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=eggjs.org; secure; httponly');
        const expires = cookie.match(/expires=([^;]+);/)[1];
        (new Date() > new Date(expires)).should.equal(true);
        done();
      });
    });

    it('should set cookie with domain: okcookie.eggjs.org', done => {
      request(app.callback())
      .get('/?cookiedomain=okcookie.eggjs.org&cookiepath=/')
      .set('Host', 'demo.eggjs.org')
      .set('X-Forwarded-Proto', 'https')
      .expect('hello mock secure app')
      .expect(200, (err, res) => {
        should.not.exist(err);
        const cookie = res.headers['set-cookie'][0];
        should.exist(cookie);
        cookie.should.equal('cookiepath=/; path=/; domain=okcookie.eggjs.org; secure; httponly');
        done();
      });
    });

    it('should not set domain and path', done => {
      request(app.callback())
      .get('/?notSetPath=okok')
      .set('Host', 'demo.eggjs.org')
      .set('X-Forwarded-Proto', 'https')
      .expect('hello mock secure app')
      .expect(200, (err, res) => {
        should.not.exist(err);
        const cookie = res.headers['set-cookie'][0];
        should.exist(cookie);
        cookie.should.equal('notSetPath=okok; secure; httponly');
        done();
      });
    });
  });

  describe('secure = false', () => {
    it('should set secure:false cookie', done => {
      const app = utils.app('apps/demo');
      request(app.callback())
      .get('/hello')
      .set('Host', 'demo.eggjs.org')
      .expect('hello')
      .expect(200, (err, res) => {
        should.not.exist(err);
        const cookie = res.headers['set-cookie'][0];
        should.exist(cookie);
        cookie.should.match('hi=foo; path=/; httponly');
        done();
      });
    });
  });

  describe('encrypt = true', () => {
    let app;

    before(() => {
      app = utils.app('apps/encrypt-cookies');
      return app.ready();
    });

    after(() => app.close());

    it('should get encrypt cookie', done => {
      request(app.callback())
      .get('/')
      .expect({
        set: 'bar 中文',
      })
      .expect(200, (err, res) => {
        should.not.exist(err);
        const encryptCookie = res.headers['set-cookie'][0];
        should.exist(encryptCookie);
        encryptCookie.should.equal('foo=B9om8kiaZ7Xg9dzTUoH-Pw==; path=/; httponly');

        const plainCookie = res.headers['set-cookie'][1];
        should.exist(plainCookie);
        plainCookie.should.equal('plain=text ok; path=/; httponly');

        request(app.callback())
        .get('/')
        .set('Cookie', res.headers['set-cookie'].join(';'))
        .expect({
          set: 'bar 中文',
          encrypt: 'bar 中文',
          encryptWrong: 'B9om8kiaZ7Xg9dzTUoH-Pw==',
          plain: 'text ok',
        })
        .expect(200, done);
      });
    });

    it('should decode encrypt value fail', done => {
      request(app.callback())
      .get('/')
      .expect({
        set: 'bar 中文',
      })
      .expect(200, (err, res) => {
        should.not.exist(err);
        const encryptCookie = res.headers['set-cookie'][0];
        should.exist(encryptCookie);
        encryptCookie.should.equal('foo=B9om8kiaZ7Xg9dzTUoH-Pw==; path=/; httponly');

        request(app.callback())
        .get('/')
        .set('Cookie', 'foo=123123; plain=text ok')
        .expect({
          set: 'bar 中文',
          encryptWrong: '123123',
          plain: 'text ok',
        })
        .expect(200, done);
      });
    });
  });
});
