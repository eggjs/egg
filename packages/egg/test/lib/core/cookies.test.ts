import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';
import { mm } from '@eggjs/mock';

import { createApp, type MockApplication, getFilepath } from '../../utils.ts';

describe('test/lib/core/cookies.test.ts', () => {
  afterEach(mm.restore);

  describe('secure = true', () => {
    let app: MockApplication;
    beforeAll(async () => {
      app = createApp('apps/secure-app');
      await app.ready();
    });
    afterAll(() => app.close());

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

    it.skip('should log CookieLimitExceed error when cookie value too long', async () => {
      const ctx = app.mockContext();
      const value = Buffer.alloc(4094).fill(49).toString();
      ctx.cookies.set('foo', value);
      const logPath = path.join(getFilepath('apps/secure-app'), 'logs/secure-app/common-error.log');
      const content = fs.readFileSync(logPath, 'utf8');
      assert.match(content, /CookieLimitExceedError: cookie foo's length\(4094\) exceed the limit\(4093\)/);
    });

    it('should throw TypeError when set encrypt on keys not exists', () => {
      mm(app, 'keys', null);
      const ctx = app.mockContext();
      assert.throws(() => {
        ctx.cookies.set('foo', 'bar', {
          encrypt: true,
        } as any);
      }, /\.keys required for encrypt\/sign cookies/);
    });

    it('should throw TypeError when get encrypt on keys not exists', () => {
      mm(app, 'keys', null);
      const ctx = app.mockContext();
      ctx.header.cookie = 'foo=bar';
      assert.throws(() => {
        ctx.cookies.get('foo', {
          encrypt: true,
        } as any);
      }, /\.keys required for encrypt\/sign cookies/);
    });

    it('should not set secure when request protocol is http', async () => {
      const res = await app
        .httpRequest()
        .get('/?setCookieValue=foobar')
        .set('Host', 'demo.eggjs.org')
        .set('X-Forwarded-Proto', 'http')
        .expect('hello mock secure app')
        .expect(200);
      const cookie = res.headers['set-cookie'][0];
      assert(cookie);
      assert.equal(cookie, 'foo-cookie=foobar; path=/; httponly');
    });

    it('should set secure:true and httponly cookie', async () => {
      const res = await app
        .httpRequest()
        .get('/?setCookieValue=foobar')
        .set('Host', 'demo.eggjs.org')
        .set('X-Forwarded-Proto', 'https')
        .expect('hello mock secure app')
        .expect(200);
      const cookie = res.headers['set-cookie'][0];
      assert(cookie);
      assert.equal(cookie, 'foo-cookie=foobar; path=/; secure; httponly');
    });

    it('should set cookie with path: /cookiepath/ok', async () => {
      const res = await app
        .httpRequest()
        .get('/?cookiepath=/cookiepath/ok')
        .set('Host', 'demo.eggjs.org')
        .set('X-Forwarded-Proto', 'https')
        .expect('hello mock secure app')
        .expect(200);
      const cookie = res.headers['set-cookie'][0];
      assert(cookie);
      assert(cookie.match(/^cookiepath=\/cookiepath\/ok; path=\/cookiepath\/ok; secure; httponly$/));
    });

    it('should delete cookie', async () => {
      const res = await app
        .httpRequest()
        .get('/?cookiedel=true')
        .set('Host', 'demo.eggjs.org')
        .set('Cookie', 'cookiedel=true')
        .set('X-Forwarded-Proto', 'https')
        .expect('hello mock secure app')
        .expect(200);
      const cookie = res.headers['set-cookie'][0];
      assert(cookie);
      assert.equal(cookie, 'cookiedel=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; httponly');
      const expires = cookie.match(/expires=([^;]+);/)![1];
      assert.equal(new Date() > new Date(expires), true);
    });

    it('should delete cookie with options', async () => {
      const res = await app
        .httpRequest()
        .get('/?cookiedel=true&opts=true')
        .set('Host', 'demo.eggjs.org')
        .set('Cookie', 'cookiedel=true; path=/hello; domain=eggjs.org; expires=30')
        .set('X-Forwarded-Proto', 'https')
        .expect('hello mock secure app')
        .expect(200);
      const cookie = res.headers['set-cookie'][0];
      assert(cookie);
      assert.equal(
        cookie,
        'cookiedel=; path=/hello; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=eggjs.org; secure; httponly'
      );
      const expires = cookie.match(/expires=([^;]+);/)![1];
      assert.equal(new Date() > new Date(expires), true);
    });

    it('should set cookie with domain: okcookie.eggjs.org', async () => {
      const res = await app
        .httpRequest()
        .get('/?cookiedomain=okcookie.eggjs.org&cookiepath=/')
        .set('Host', 'demo.eggjs.org')
        .set('X-Forwarded-Proto', 'https')
        .expect('hello mock secure app')
        .expect(200);
      const cookie = res.headers['set-cookie'][0];
      assert(cookie);
      assert.equal(cookie, 'cookiepath=/; path=/; domain=okcookie.eggjs.org; secure; httponly');
    });

    it('should not set domain and path', async () => {
      const res = await app
        .httpRequest()
        .get('/?notSetPath=okok')
        .set('Host', 'demo.eggjs.org')
        .set('X-Forwarded-Proto', 'https')
        .expect('hello mock secure app')
        .expect(200);
      const cookie = res.headers['set-cookie'][0];
      assert(cookie);
      assert.equal(cookie, 'notSetPath=okok; secure; httponly');
    });
  });

  describe('secure = false', () => {
    let app: MockApplication;
    beforeAll(() => {
      app = createApp('apps/demo');
      return app.ready();
    });
    afterAll(() => app.close());

    it('should set secure:false cookie', async () => {
      const res = await app.httpRequest().get('/hello').set('Host', 'demo.eggjs.org').expect('hello').expect(200);
      const cookies = res.headers['set-cookie'] as unknown as string[];
      const cookie = cookies.join(';');
      assert(cookie);
      assert(cookie.match(/hi=foo; path=\/; httponly/));
    });
  });

  describe('encrypt = true', () => {
    let app: MockApplication;

    beforeAll(() => {
      app = createApp('apps/encrypt-cookies');
      return app.ready();
    });
    afterAll(() => app.close());

    it('should get encrypt cookie', async () => {
      const res = await app
        .httpRequest()
        .get('/')
        .expect({
          set: 'bar 中文',
        })
        .expect(200);
      const encryptCookie = res.headers['set-cookie'][0];
      assert(encryptCookie);
      assert.equal(encryptCookie, 'foo=B9om8kiaZ7Xg9dzTUoH-Pw==; path=/; httponly');

      const plainCookie = res.headers['set-cookie'][1];
      assert(plainCookie);
      assert.equal(plainCookie, 'plain=text ok; path=/; httponly');

      const cookies = res.headers['set-cookie'] as unknown as string[];
      await app
        .httpRequest()
        .get('/')
        .set('Cookie', cookies.join(';'))
        .expect({
          set: 'bar 中文',
          encrypt: 'bar 中文',
          encryptWrong: 'B9om8kiaZ7Xg9dzTUoH-Pw==',
          plain: 'text ok',
        })
        .expect(200);
    });

    it('should decode encrypt value fail', async () => {
      const res = await app
        .httpRequest()
        .get('/')
        .expect({
          set: 'bar 中文',
        })
        .expect(200);
      const encryptCookie = res.headers['set-cookie'][0];
      assert(encryptCookie);
      assert.equal(encryptCookie, 'foo=B9om8kiaZ7Xg9dzTUoH-Pw==; path=/; httponly');

      await app
        .httpRequest()
        .get('/')
        .set('Cookie', 'foo=123123; plain=text ok')
        .expect({
          set: 'bar 中文',
          encryptWrong: '123123',
          plain: 'text ok',
        })
        .expect(200);
    });
  });
});
