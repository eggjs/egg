import path from 'node:path';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, beforeAll, afterAll, afterEach, expect } from 'vitest';

function getFixtures(name: string) {
  return path.join(import.meta.dirname, 'fixtures', name);
}

describe('test/i18n.test.ts', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/i18n'),
    });
    await app.ready();
  });
  afterAll(() => app.close());

  afterEach(mm.restore);

  describe('ctx.__(key, value)', () => {
    it('should return locale de', async () => {
      await app
        .httpRequest()
        .get('/message?locale=de')
        .expect(200)
        .expect('Set-Cookie', /,locale=de; path=\/; max-age=31557600; expires=[^;]+ GMT$/)
        .expect({
          message: 'Hallo fengmk2, wie geht es dir heute? Wie war dein 18.',
          empty: '',
          notexists_key: 'key not exists',
          empty_string: '',
          novalue: 'key %s ok',
          arguments3: '1 2 3',
          arguments4: '1 2 3 4',
          arguments5: '1 2 3 4 5',
          arguments6: '1 2 3 4 5. 6',
          values: 'foo bar foo bar {2} {100}',
        });
    });

    it('should return default locale en_US', async () => {
      await app
        .httpRequest()
        .get('/message?locale=')
        .expect(200)
        .expect('Set-Cookie', /locale=en-us; path=\/; max-age=31557600; expires=[^;]+ GMT$/)
        .expect({
          message: 'Hello fengmk2, how are you today? How was your 18.',
          empty: '',
          notexists_key: 'key not exists',
          empty_string: '',
          novalue: 'key %s ok',
          arguments3: '1 2 3',
          arguments4: '1 2 3 4',
          arguments5: '1 2 3 4 5',
          arguments6: '1 2 3 4 5. 6',
          values: 'foo bar foo bar {2} {100}',
        });
    });

    it('should return get locale from cookie', async () => {
      await app.httpRequest().get('/message').set('Cookie', 'locale=zh-cn').expect(200).expect({
        message: 'fengmk2 你好, 今天过得如何？你的 18 如何。',
        empty: '',
        notexists_key: 'key not exists',
        empty_string: '',
        novalue: 'key %s ok',
        arguments3: '1 2 3',
        arguments4: '1 2 3 4',
        arguments5: '1 2 3 4 5',
        arguments6: '1 2 3 4 5. 6',
        values: 'foo bar foo bar {2} {100}',
      });
    });

    it('should __() work', () => {
      const ctx = app.mockContext();
      expect(ctx.__('')).toBe('');
      expect(ctx.__('Email')).toBe('Email');
      expect(ctx.__('Email %s', 'ok')).toBe('Email ok');
      expect(ctx.__('Email %s %d', 'ok', 1)).toBe('Email ok 1');
      expect(ctx.__('Email %s %d %j', 'ok', 1, { foo: 'bar' })).toBe('Email ok 1 {"foo":"bar"}');
      expect(ctx.__('Email %s %d %j %s', 'ok', 1, { foo: 'bar' }, 'foo')).toBe('Email ok 1 {"foo":"bar"} foo');
      expect(ctx.__('Email {a} {b}', { a: 'a', b: 'b' })).toBe('Email a b');
      expect(ctx.__('Email {a} {b} {c}', { a: 'a', b: 'b' })).toBe('Email a b {c}');
      expect(ctx.__('Email {0} {1}', ['a', 'b'])).toBe('Email a b');
      expect(ctx.app.__('en-us', 'Email {0} {1}', ['a', 'b'])).toBe('Email a b');
      expect(ctx.app.__('en-us', '', ['a', 'b'])).toBe('');
    });

    it('should ctx.locals.__() work', () => {
      const ctx = app.mockContext();
      expect(ctx.locals.__('Email %s', 'ok')).toBe('Email ok');
      ctx.locals.a = 'aaa';
      expect(ctx.locals.a).toBe('aaa');
      expect(Object.keys(ctx.locals)).toEqual(['__', 'gettext', 'a']);
    });

    it('should not allow to override the app.locals.__', () => {
      expect(() => {
        app.locals.__ = () => 'app.__';
      }).toThrow(/Cannot assign to read only property '__' of object/);
    });
  });

  describe('with cookieDomain', () => {
    let app: MockApplication;
    beforeAll(async () => {
      app = mm.app({
        baseDir: getFixtures('apps/i18n-domain'),
      });
      await app.ready();
    });
    afterAll(() => app.close());

    it('should return locale de', async () => {
      await app
        .httpRequest()
        .get('/message?locale=de')
        .expect(200)
        .expect('Set-Cookie', /locale=de; path=\/; max-age=31557600; expires=[^;]+ GMT; domain=.foo.com$/)
        .expect({
          message: 'Hallo fengmk2, wie geht es dir heute? Wie war dein 18.',
          empty: '',
          notexists_key: 'key not exists',
          empty_string: '',
          novalue: 'key %s ok',
          arguments3: '1 2 3',
          arguments4: '1 2 3 4',
          arguments5: '1 2 3 4 5',
          arguments6: '1 2 3 4 5. 6',
          values: 'foo bar foo bar {2} {100}',
        });
    });

    it('should return default locale en_US', async () => {
      await app
        .httpRequest()
        .get('/message?locale=')
        .expect(200)
        .expect('Set-Cookie', /locale=en-us; path=\/; max-age=31557600; expires=[^;]+ GMT; domain=.foo.com$/)
        .expect({
          message: 'Hello fengmk2, how are you today? How was your 18.',
          empty: '',
          notexists_key: 'key not exists',
          empty_string: '',
          novalue: 'key %s ok',
          arguments3: '1 2 3',
          arguments4: '1 2 3 4',
          arguments5: '1 2 3 4 5',
          arguments6: '1 2 3 4 5. 6',
          values: 'foo bar foo bar {2} {100}',
        });
    });
  });

  describe('ctx.locale', () => {
    let app: MockApplication;
    beforeAll(async () => {
      app = mm.app({
        baseDir: getFixtures('apps/i18n'),
      });
      await app.ready();
    });
    afterAll(() => app.close());

    it('should get request default locale', () => {
      const ctx = app.mockContext();
      expect(ctx.locale).toBe('en-us');
    });

    it('should get request locale from cookie', () => {
      const ctx = app.mockContext({
        headers: {
          cookie: 'locale=zh-CN',
        },
      });
      expect(ctx.locale).toBe('zh-cn');
    });
  });

  describe('loader', () => {
    let app: MockApplication;
    beforeAll(async () => {
      app = mm.app({
        baseDir: getFixtures('apps/loader'),
        framework: getFixtures('custom_egg'),
      });
      await app.ready();
    });
    afterAll(() => app.close());

    it('should return locale from plugin a', async () => {
      await app.httpRequest().get('/?key=pluginA').set('Accept-Language', 'zh-CN,zh;q=0.5').expect('true');
    });

    it('should load locale resource from .ts file work', async () => {
      await app
        .httpRequest()
        .get('/?key=pluginATS')
        .set('Accept-Language', 'zh-CN,zh;q=0.5')
        .expect('text from ts file');
    });

    it('should load locale resource from .yaml file work', async () => {
      await app.httpRequest().get('/?key=EmailYaml').set('Accept-Language', 'zh-CN,zh;q=0.5').expect('邮箱 from yaml');
    });

    it('should load locale resource from .properties file work', async () => {
      await app
        .httpRequest()
        .get('/?key=EmailIni')
        .set('Accept-Language', 'zh-CN,zh;q=0.5')
        .expect('邮箱 from properties');
    });

    it('should return locale from plugin b', async () => {
      await app.httpRequest().get('/?key=pluginB').set('Accept-Language', 'zh-CN,zh;q=0.5').expect('true');
    });

    it('should return locale from framework', async () => {
      await app.httpRequest().get('/?key=framework').set('Accept-Language', 'zh-CN,zh;q=0.5').expect('true');
    });

    it('should return locale from locales2', async () => {
      await app.httpRequest().get('/?key=locales2').set('Accept-Language', 'zh-CN,zh;q=0.5').expect('true');
    });

    it('should use locale/ when both exist locales/ and locale/', async () => {
      await app.httpRequest().get('/?key=pluginC').set('Accept-Language', 'zh-CN,zh;q=0.5').expect('i18n form locale');
    });

    describe('view renderString with __(key, value)', () => {
      it('should render with default locale: en-US', async () => {
        await app
          .httpRequest()
          .get('/renderString')
          .expect(200)
          .expect('Set-Cookie', /locale=en-us; path=\/; max-age=31557600; expires=[^;]+ GMT/)
          .expect('<li>Email: </li>\n<li>Hello fengmk2, how are you today?</li>\n<li>foo bar</li>\n');
      });

      it('should render with query locale: zh_CN', async () => {
        await app
          .httpRequest()
          .get('/renderString?locale=zh_CN')
          .expect(200)
          .expect('Set-Cookie', /locale=zh-cn; path=\/; max-age=31557600; expires=[^;]+ GMT/)
          .expect('<li>邮箱: </li>\n<li>fengmk2，今天过得如何？</li>\n<li>foo bar</li>\n');
      });

      // Accept-Language: zh-CN,zh;q=0.5
      // Accept-Language: zh-CN;q=1
      // Accept-Language: zh-CN
      it('should render with Accept-Language: zh-CN,zh;q=0.5', async () => {
        await app
          .httpRequest()
          .get('/renderString')
          .set('Accept-Language', 'zh-CN,zh;q=0.5')
          .expect(200)
          .expect('Set-Cookie', /locale=zh-cn; path=\/; max-age=31557600; expires=[^;]+ GMT/)
          .expect('<li>邮箱: </li>\n<li>fengmk2，今天过得如何？</li>\n<li>foo bar</li>\n');

        await app
          .httpRequest()
          .get('/renderString')
          .set('Accept-Language', 'zh-CN;q=1')
          .expect(200)
          .expect('Set-Cookie', /locale=zh-cn; path=\/; max-age=31557600; expires=[^;]+ GMT/)
          .expect('<li>邮箱: </li>\n<li>fengmk2，今天过得如何？</li>\n<li>foo bar</li>\n');

        await app
          .httpRequest()
          .get('/renderString')
          .set('Accept-Language', 'zh_cn')
          .expect(200)
          .expect('Set-Cookie', /locale=zh-cn; path=\/; max-age=31557600; expires=[^;]+ GMT/)
          .expect('<li>邮箱: </li>\n<li>fengmk2，今天过得如何？</li>\n<li>foo bar</li>\n');
      });

      it('should render set cookie locale: zh-CN if query locale not equal to cookie', async () => {
        await app
          .httpRequest()
          .get('/renderString?locale=en-US')
          .set('Cookie', 'locale=zh-CN')
          .expect(200)
          .expect('Set-Cookie', /locale=en-us; path=\/; max-age=31557600; expires=[^;]+ GMT/)
          .expect('<li>Email: </li>\n<li>Hello fengmk2, how are you today?</li>\n<li>foo bar</li>\n');
      });

      it('should render with cookie locale: zh-cn', async () => {
        await app
          .httpRequest()
          .get('/renderString')
          .set('Cookie', 'locale=zh-cn')
          .expect(200)
          .expect('<li>邮箱: </li>\n<li>fengmk2，今天过得如何？</li>\n<li>foo bar</li>\n')
          .expect(res => {
            // cookie should not change
            const setCookies = res.headers['set-cookie'];
            expect(setCookies).not.toContain('locale=');
          });
      });
    });
  });

  describe('ctx.locale', () => {
    it('should locale work and can be override', () => {
      const ctx = app.mockContext({
        query: { locale: 'zh-cn' },
      });
      expect(ctx.locale).toBe('zh-cn');
      expect(ctx.response.headers['set-cookie']).toBeDefined();
      expect(ctx.response.headers['set-cookie']).toHaveLength(1);
      expect(ctx.response.headers['set-cookie']![0]).toMatch(
        /^locale=zh-cn; path=\/; max-age=31557600; expires=[^;]+ GMT$/
      );
      ctx.locale = 'en-us';
      expect(ctx.response.headers['set-cookie']).toHaveLength(1);
      expect(ctx.response.headers['set-cookie']![0]).toMatch(
        /^locale=en-us; path=\/; max-age=31557600; expires=[^;]+ GMT$/
      );
      expect(ctx.locale).toBe('en-us');
      expect(ctx.response.headers['set-cookie']).toHaveLength(1);
      expect(ctx.response.headers['set-cookie']![0]).toMatch(
        /^locale=en-us; path=\/; max-age=31557600; expires=[^;]+ GMT$/
      );
    });
  });
});
