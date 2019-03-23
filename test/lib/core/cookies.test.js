'use strict';

const assert = require('assert');
const mm = require('egg-mock');
const utils = require('../../utils');
const fs = require('fs');
const path = require('path');

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
      assert.throws(() => {
        ctx.cookies.set('foo', 'bar', { secure: true });
      }, /Cannot send secure cookie over unencrypted connection/);
    });

    it('should set cookie twice and not set domain when ctx.hostname=localhost', () => {
      const ctx = app.mockContext();
      ctx.set('Set-Cookie', 'foo=bar');
      ctx.cookies.set('foo1', 'bar1');
      assert.deepEqual(ctx.response.get('set-cookie'), [
        'foo=bar',
        'foo1=bar1; path=/; httponly',
        'foo1.sig=Fqo9DaOWFOs3Gxsv0OHgyhhnJrjuY8jItBdSO-5WRgM; path=/; httponly',
      ]);
    });

    it('should log CookieLimitExceed error when cookie value too long', done => {
      const ctx = app.mockContext();
      const value = Buffer.alloc(4094).fill(49).toString();
      ctx.cookies.set('foo', value);
      setTimeout(() => {
        const logPath = path.join(utils.getFilepath('apps/secure-app'), 'logs/secure-app/common-error.log');
        const content = fs.readFileSync(logPath, 'utf8');
        assert(content.match(/CookieLimitExceedError: cookie foo's length\(4094\) exceed the limit\(4093\)/));
        done();
      }, 100);
    });

    it('should throw TypeError when set encrypt on keys not exists', () => {
      mm(app, 'keys', null);
      const ctx = app.mockContext();
      assert.throws(() => {
        ctx.cookies.set('foo', 'bar', {
          encrypt: true,
        });
      }, /\.keys required for encrypt\/sign cookies/);
    });

    it('should throw TypeError when get encrypt on keys not exists', () => {
      mm(app, 'keys', null);
      const ctx = app.mockContext();
      ctx.header.cookie = 'foo=bar';
      assert.throws(() => {
        ctx.cookies.get('foo', {
          encrypt: true,
        });
      }, /\.keys required for encrypt\/sign cookies/);
    });

    it('should not set secure when request protocol is http', done => {
      app.httpRequest()
        .get('/?setCookieValue=foobar')
        .set('Host', 'demo.eggjs.org')
        .set('X-Forwarded-Proto', 'http')
        .expect('hello mock secure app')
        .expect(200, (err, res) => {
          assert(!err);
          const cookie = res.headers['set-cookie'][0];
          assert(cookie);
          assert.equal(cookie, 'foo-cookie=foobar; path=/; httponly');
          done();
        });
    });

    it('should set secure:true and httponly cookie', done => {
      app.httpRequest()
        .get('/?setCookieValue=foobar')
        .set('Host', 'demo.eggjs.org')
        .set('X-Forwarded-Proto', 'https')
        .expect('hello mock secure app')
        .expect(200, (err, res) => {
          assert(!err);
          const cookie = res.headers['set-cookie'][0];
          assert(cookie);
          assert.equal(cookie, 'foo-cookie=foobar; path=/; secure; httponly');
          done();
        });
    });

    it('should set cookie with path: /cookiepath/ok', done => {
      app.httpRequest()
        .get('/?cookiepath=/cookiepath/ok')
        .set('Host', 'demo.eggjs.org')
        .set('X-Forwarded-Proto', 'https')
        .expect('hello mock secure app')
        .expect(200, (err, res) => {
          assert(!err);
          const cookie = res.headers['set-cookie'][0];
          assert(cookie);
          assert(cookie.match(/^cookiepath=\/cookiepath\/ok; path=\/cookiepath\/ok; secure; httponly$/));
          done();
        });
    });

    it('should delete cookie', done => {
      app.httpRequest()
        .get('/?cookiedel=true')
        .set('Host', 'demo.eggjs.org')
        .set('Cookie', 'cookiedel=true')
        .set('X-Forwarded-Proto', 'https')
        .expect('hello mock secure app')
        .expect(200, (err, res) => {
          assert(!err);
          const cookie = res.headers['set-cookie'][0];
          assert(cookie);
          assert.equal(cookie, 'cookiedel=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; httponly');
          const expires = cookie.match(/expires=([^;]+);/)[1];
          assert.equal((new Date() > new Date(expires)), true);
          done();
        });
    });

    it('should delete cookie with options', done => {
      app.httpRequest()
        .get('/?cookiedel=true&opts=true')
        .set('Host', 'demo.eggjs.org')
        .set('Cookie', 'cookiedel=true; path=/hello; domain=eggjs.org; expires=30')
        .set('X-Forwarded-Proto', 'https')
        .expect('hello mock secure app')
        .expect(200, (err, res) => {
          const cookie = res.headers['set-cookie'][0];
          assert(cookie);
          assert.equal(cookie, 'cookiedel=; path=/hello; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=eggjs.org; secure; httponly');
          const expires = cookie.match(/expires=([^;]+);/)[1];
          assert.equal((new Date() > new Date(expires)), true);
          done();
        });
    });

    it('should set cookie with domain: okcookie.eggjs.org', done => {
      app.httpRequest()
        .get('/?cookiedomain=okcookie.eggjs.org&cookiepath=/')
        .set('Host', 'demo.eggjs.org')
        .set('X-Forwarded-Proto', 'https')
        .expect('hello mock secure app')
        .expect(200, (err, res) => {
          assert(!err);
          const cookie = res.headers['set-cookie'][0];
          assert(cookie);
          assert.equal(cookie, 'cookiepath=/; path=/; domain=okcookie.eggjs.org; secure; httponly');
          done();
        });
    });

    it('should not set domain and path', done => {
      app.httpRequest()
        .get('/?notSetPath=okok')
        .set('Host', 'demo.eggjs.org')
        .set('X-Forwarded-Proto', 'https')
        .expect('hello mock secure app')
        .expect(200, (err, res) => {
          assert(!err);
          const cookie = res.headers['set-cookie'][0];
          assert(cookie);
          assert.equal(cookie, 'notSetPath=okok; secure; httponly');
          done();
        });
    });
  });

  describe('secure = false', () => {
    let app;
    before(() => {
      app = utils.app('apps/demo');
      return app.ready();
    });
    after(() => app.close());

    it('should set secure:false cookie', done => {
      app.httpRequest()
        .get('/hello')
        .set('Host', 'demo.eggjs.org')
        .expect('hello')
        .expect(200, (err, res) => {
          assert(!err);
          const cookie = res.headers['set-cookie'].join(';');
          assert(cookie);
          assert(cookie.match(/hi=foo; path=\/; httponly/));
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
      app.httpRequest()
        .get('/')
        .expect({
          set: 'bar 中文',
        })
        .expect(200, (err, res) => {
          assert(!err);
          const encryptCookie = res.headers['set-cookie'][0];
          assert(encryptCookie);
          assert.equal(encryptCookie, 'foo=B9om8kiaZ7Xg9dzTUoH-Pw==; path=/; httponly');

          const plainCookie = res.headers['set-cookie'][1];
          assert(plainCookie);
          assert.equal(plainCookie, 'plain=text ok; path=/; httponly');

          app.httpRequest()
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
      app.httpRequest()
        .get('/')
        .expect({
          set: 'bar 中文',
        })
        .expect(200, (err, res) => {
          assert(!err);
          const encryptCookie = res.headers['set-cookie'][0];
          assert(encryptCookie);
          assert.equal(encryptCookie, 'foo=B9om8kiaZ7Xg9dzTUoH-Pw==; path=/; httponly');

          app.httpRequest()
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
