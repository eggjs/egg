import { strict as assert } from 'node:assert';

import { describe, expect, it, vi } from 'vitest';

import { CookieError, type CookieSetOptions } from '../src/index.ts';
import Cookies from './cookies.ts';

describe('test/cookies.test.ts', () => {
  it('should encrypt error when keys not present', () => {
    const cookies = Cookies({}, { keys: null });
    try {
      cookies.set('foo', 'bar', { encrypt: true });
      throw new Error('should not exec');
    } catch (err: any) {
      assert.equal(err.message, '.keys required for encrypt/sign cookies');
    }
  });

  it('should not thrown when keys not present and do not use encrypt or sign', () => {
    const cookies = Cookies({}, { keys: null });
    cookies.set('foo', 'bar', { encrypt: false, signed: false });
  });

  it('should encrypt ok', () => {
    const cookies = Cookies();
    cookies.set('foo', 'bar', { encrypt: true });
    const cookie = cookies.ctx.response.headers['set-cookie'][0];
    cookies.ctx.request.headers.cookie = cookie;
    const value = cookies.get('foo', { encrypt: true });
    assert(value, 'bar');
    assert(cookie.indexOf('bar') === -1);
  });

  it('should cache keygrip', () => {
    const keys = ['key'];
    assert.equal(Cookies({}, { keys }).keys, Cookies({}, { keys }).keys);
    assert.equal(Cookies({}, { keys }).keys, Cookies({}, { keys }).keys);
    assert.equal(Cookies({}, { keys }).keys, Cookies({}, { keys }).keys);
    assert.notEqual(Cookies({}, { keys }).keys, Cookies({}, { keys: ['foo'] }).keys);
  });

  it('should encrypt failed return undefined', () => {
    const cookies = Cookies();
    cookies.set('foo', 'bar', { encrypt: true });
    const cookie = cookies.ctx.response.headers['set-cookie'][0];
    const newCookies = Cookies(
      {
        headers: { cookie },
      },
      { keys: ['another key'] }
    );
    const value = newCookies.get('foo', { encrypt: true });
    assert(value === undefined);
  });

  it('should disable signed when encrypt enable', () => {
    const cookies = Cookies();
    cookies.set('foo', 'bar', { encrypt: true, signed: true });
    const cookie = cookies.ctx.response.headers['set-cookie'].join(';');
    cookies.ctx.request.headers.cookie = cookie;
    const value = cookies.get('foo', { encrypt: true });
    assert(value, 'bar');
    assert(cookie.indexOf('bar') === -1);
    assert(cookie.indexOf('sig') === -1);
  });

  it('should work with secure ok', () => {
    const cookies = Cookies(
      {},
      {
        secure: true,
      }
    );
    cookies.set('foo', 'bar', { encrypt: true });
    const cookie = cookies.ctx.response.headers['set-cookie'][0];
    assert(cookie.indexOf('secure') > 0);
  });

  it('should work with domain ok, when domain is a function', () => {
    const cookies = Cookies(
      {},
      {
        secure: true,
      }
    );
    cookies.set('foo', 'bar', { encrypt: true, domain: () => 'foo.com' });
    const cookie = cookies.ctx.response.headers['set-cookie'][0];
    assert(cookie.indexOf('domain=foo.com') > 0);
  });

  it('should work with domain is empty string', () => {
    const cookies = Cookies(
      {},
      {
        secure: true,
      }
    );
    cookies.set('foo', 'bar', { encrypt: true, domain: '' });
    const cookie = cookies.ctx.response.headers['set-cookie'][0];
    assert.equal(cookie, 'foo=SBfi5dnMSwNmMdeydI_zdw==; path=/; secure; httponly');
  });

  it('should work with domain is string', () => {
    const cookies = Cookies(
      {},
      {
        secure: true,
      }
    );
    cookies.set('foo', 'bar', { encrypt: true, domain: 'foo.com' });
    const cookie = cookies.ctx.response.headers['set-cookie'][0];
    assert(cookie.indexOf('domain=foo.com') > 0);
  });

  it('should signed work fine', () => {
    const cookies = Cookies();
    cookies.set('foo', 'bar', { signed: true });
    const cookie = cookies.ctx.response.headers['set-cookie'].join(';');
    assert(cookie.indexOf('foo=bar') >= 0);
    assert(cookie.indexOf('foo.sig=') >= 0);
    cookies.ctx.request.headers.cookie = cookie;
    let value = cookies.get('foo', { signed: true });
    assert(value === 'bar');
    cookies.ctx.request.headers.cookie = cookie.replace('foo=bar', 'foo=bar1');
    value = cookies.get('foo', { signed: true });
    assert(!value);
    value = cookies.get('foo', { signed: false });
    assert(value === 'bar1');
  });

  it('should return undefined when header.cookie not exists', () => {
    const cookies = Cookies();
    assert(cookies.get('hello') === undefined);
  });

  it('should return undefined when cookie not exists', () => {
    const cookies = Cookies({
      headers: { cookie: 'foo=bar' },
    });
    assert(cookies.get('hello') === undefined);
  });

  it('should return undefined when signed and name.sig not exists', () => {
    const cookies = Cookies({
      headers: { cookie: 'foo=bar;' },
    });
    assert(cookies.get('foo', { signed: true }) === undefined);
    assert(cookies.get('foo', { signed: false }) === 'bar');
    assert(cookies.get('foo') === undefined);
  });

  it('should set .sig to null if not match', () => {
    const cookies = Cookies({
      headers: { cookie: 'foo=bar;foo.sig=bar.sig;' },
    });
    assert(cookies.get('foo', { signed: true }) === undefined);
    assert(
      cookies.ctx.response.headers['set-cookie'][0] ===
        'foo.sig=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; httponly'
    );
  });

  it('should update .sig if not match the first key', () => {
    const cookies = Cookies(
      {
        headers: { cookie: 'foo=bar;foo.sig=bar.sig;' },
      },
      { keys: ['hello', 'world'] }
    );
    cookies.set('foo', 'bar');
    const cookie = cookies.ctx.response.headers['set-cookie'].join(';');

    const newCookies = Cookies(
      {
        headers: { cookie },
      },
      { keys: ['hi', 'hello'] }
    );

    assert(newCookies.get('foo', { signed: true }) === 'bar');
    // call twice but should only update once
    newCookies.get('foo', { signed: true });
    assert(newCookies.ctx.response.headers['set-cookie'].length === 1);
    const newSign = newCookies.keys.sign('foo=bar');
    assert(newCookies.ctx.response.headers['set-cookie'][0].startsWith(`foo.sig=${newSign}`));
  });

  it('should not overwrite default', () => {
    const cookies = Cookies();
    cookies.set('foo', 'bar');
    cookies.set('foo', 'hello');
    assert(cookies.ctx.response.headers['set-cookie'].join(';').match(/foo=bar/));
  });

  it('should overwrite when opts.overwrite = true', () => {
    const cookies = Cookies();
    cookies.set('foo', 'bar');
    cookies.set('foo', 'hello', { overwrite: true });
    assert(cookies.ctx.response.headers['set-cookie'].join(';').match(/foo=hello/));
  });

  it('should remove signed cookie ok', () => {
    const cookies = Cookies();
    cookies.set('foo', null, { signed: true });
    assert(
      cookies.ctx.response.headers['set-cookie']
        .join(';')
        .match(/foo=; path=\/; expires=Thu, 01 Jan 1970 00:00:00 GMT; httponly/)
    );
    assert(
      cookies.ctx.response.headers['set-cookie']
        .join(';')
        .match(/foo\.sig=; path=\/; expires=Thu, 01 Jan 1970 00:00:00 GMT; httponly/)
    );
  });

  it('should remove encrypt cookie ok', () => {
    const cookies = Cookies();
    cookies.set('foo', null, { encrypt: true });
    assert(
      cookies.ctx.response.headers['set-cookie']
        .join(';')
        .match(/foo=; path=\/; expires=Thu, 01 Jan 1970 00:00:00 GMT; httponly/)
    );
  });

  it('should remove cookie ok event it set maxAge', () => {
    const cookies = Cookies();
    cookies.set('foo', null, { signed: true, maxAge: 1200 });
    assert(
      cookies.ctx.response.headers['set-cookie']
        .join(';')
        .match(/foo=; path=\/; expires=Thu, 01 Jan 1970 00:00:00 GMT; httponly/)
    );
    assert(
      cookies.ctx.response.headers['set-cookie']
        .join(';')
        .match(/foo\.sig=; path=\/; expires=Thu, 01 Jan 1970 00:00:00 GMT; httponly/)
    );
  });

  it('should add secure when ctx.secure = true', () => {
    const cookies = Cookies({}, { secure: true });
    cookies.set('foo', 'bar');
    assert(cookies.ctx.response.headers['set-cookie'].join(';').match(/secure;/));
  });

  it('should not add secure when ctx.secure = true but opt.secure = false', () => {
    const cookies = Cookies({}, { secure: true });
    cookies.set('foo', 'bar', { secure: false });
    assert(!cookies.ctx.response.headers['set-cookie'].join(';').match(/secure;/));
  });

  it('should throw when ctx.secure = false but opt.secure = true', () => {
    const cookies = Cookies({}, { secure: false });
    try {
      cookies.set('foo', 'bar', { secure: true });
      throw new Error('should not exec');
    } catch (err) {
      assert(err instanceof CookieError);
      assert(err.message === 'Cannot send secure cookie over unencrypted connection');
    }
  });

  it('should set cookie success when set-cookie already exist', () => {
    const cookies = Cookies();
    cookies.ctx.response.headers['set-cookie'] = 'foo=bar';
    cookies.set('foo1', 'bar1');
    assert(cookies.ctx.response.headers['set-cookie'][0] === 'foo=bar');
    assert(cookies.ctx.response.headers['set-cookie'][1] === 'foo1=bar1; path=/; httponly');
    assert(
      cookies.ctx.response.headers['set-cookie'][2] ===
        'foo1.sig=_OGF14M_XqPTd58nMRUco2iwwhlZvq7h8ifl3Kej_jg; path=/; httponly'
    );
  });

  it('should emit cookieLimitExceed event in app when value length exceed the limit', () => {
    const cookies = Cookies();
    const value = Buffer.alloc(4094).fill(49).toString();
    const emit = vi.spyOn(cookies.app, 'emit');
    cookies.set('foo', value);

    expect(emit.mock.calls.length).toBe(1);
    expect(emit.mock.calls[0][0]).toBe('cookieLimitExceed');
    expect(emit.mock.calls[0][1]).toEqual({
      name: 'foo',
      value,
      ctx: cookies.ctx,
    });
    expect(cookies.ctx.response.headers['set-cookie'][0]).toMatch(/^foo=1{4094}; path=\/; httponly$/);
  });

  it('should opts do not modify', () => {
    const cookies = Cookies({ secure: true });
    const opts: CookieSetOptions = {
      signed: 1,
    };
    cookies.set('foo', 'hello', opts);

    assert(opts.signed === 1);
    assert(opts.secure === undefined);
    assert(cookies.ctx.response.headers['set-cookie'].join(';').match(/foo=hello/));
  });

  it('should defaultCookieOptions with sameSite=lax', () => {
    const cookies = Cookies({ secure: true }, null, { sameSite: 'lax' });
    const opts: CookieSetOptions = {
      signed: 1,
    };
    cookies.set('foo', 'hello', opts);

    assert(opts.signed === 1);
    assert(opts.secure === undefined);
    assert(cookies.ctx.response.headers['set-cookie'].join(';').match(/foo=hello/));
    for (const str of cookies.ctx.response.headers['set-cookie']) {
      assert(str.includes('; path=/; samesite=lax; httponly'));
    }
  });

  it('should not send SameSite=None property on incompatible clients', () => {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML%2C like Gecko) Chrome/64.0.3282.140 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3165.0 Safari/537.36',
      'Mozilla/5.0 (Linux; U; Android 8.1.0; zh-CN; OE106 Build/OPM1.171019.026) AppleWebKit/537.36 (KHTML%2C like Gecko) Version/4.0 Chrome/57.0.2987.108 UCBrowser/11.9.4.974 UWS/2.13.2.90 Mobile Safari/537.36 AliApp(DingTalk/4.7.18) com.alibaba.android.rimet/12362010 Channel/1565683214685 language/zh-CN UT4Aplus/0.2.25',
      'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML%2C like Gecko) Chrome/63.0.3239.132 Safari/537.36 dingtalk-win/1.0.0 nw(0.14.7) DingTalk(4.7.19-Release.16) Mojo/1.0.0 Native AppType(release)',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML%2C like Gecko) Chrome/62.0.3202.94 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML%2C like Gecko) Chrome/52.0.2723.2 Safari/537.36',
    ];
    for (const ua of userAgents) {
      const cookies = Cookies(
        {
          secure: true,
          headers: {
            'user-agent': ua,
          },
        },
        { secure: true },
        { sameSite: 'None' }
      );
      const opts: CookieSetOptions = {
        signed: 1,
      };
      cookies.set('foo', 'hello', opts);

      assert(opts.signed === 1);
      assert(opts.secure === undefined);
      assert(cookies.ctx.response.headers['set-cookie'].join(';').match(/foo=hello/));
      for (const str of cookies.ctx.response.headers['set-cookie']) {
        assert(str.includes('; path=/; secure; httponly'));
      }
    }
  });

  it('should not send SameSite=None property on Chrome < 80', () => {
    const cookies = Cookies(
      {
        secure: true,
        headers: {
          'user-agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.29 Safari/537.36',
        },
      },
      { secure: true },
      { sameSite: 'None' }
    );
    const opts: CookieSetOptions = {
      signed: 1,
    };
    cookies.set('foo', 'hello', opts);

    assert(opts.signed === 1);
    assert(opts.secure === undefined);
    assert(cookies.ctx.response.headers['set-cookie'].join(';').match(/foo=hello/));
    for (const str of cookies.ctx.response.headers['set-cookie']) {
      assert(str.includes('; path=/; secure; httponly'));
    }
  });

  it('should send SameSite=None property on Chrome >= 80', () => {
    let cookies = Cookies(
      {
        secure: true,
        headers: {
          'user-agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3945.29 Safari/537.36',
        },
      },
      { secure: true },
      { sameSite: 'None' }
    );
    const opts: CookieSetOptions = {
      signed: 1,
    };
    cookies.set('foo', 'hello', opts);

    assert(opts.signed === 1);
    assert(opts.secure === undefined);
    assert(cookies.ctx.response.headers['set-cookie'].join(';').match(/foo=hello/));
    for (const str of cookies.ctx.response.headers['set-cookie']) {
      assert(str.includes('; path=/; samesite=none; secure; httponly'));
    }

    cookies = Cookies(
      {
        secure: true,
        headers: {
          'user-agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.3945.29 Safari/537.36',
        },
      },
      { secure: true },
      { sameSite: 'None' }
    );
    cookies.set('foo', 'hello', opts);

    assert(opts.signed === 1);
    assert(opts.secure === undefined);
    assert(cookies.ctx.response.headers['set-cookie'].join(';').match(/foo=hello/));
    for (const str of cookies.ctx.response.headers['set-cookie']) {
      assert(str.includes('; path=/; samesite=none; secure; httponly'));
    }
  });

  it('should send SameSite=none property on compatible clients', () => {
    const cookies = Cookies(
      {
        secure: true,
        headers: {
          'user-agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 13_0 like Mac OS X) AppleWebKit/602.1.38 (KHTML, like Gecko) Version/66.6 Mobile/14A5297c Safari/602.1',
        },
      },
      { secure: true },
      { sameSite: 'none' }
    );

    const opts: CookieSetOptions = {
      signed: 1,
    };
    cookies.set('foo', 'hello', opts);

    assert(opts.signed === 1);
    assert(opts.secure === undefined);
    assert(cookies.ctx.response.headers['set-cookie'].join(';').match(/foo=hello/));
    for (const str of cookies.ctx.response.headers['set-cookie']) {
      assert(str.includes('; path=/; samesite=none; secure; httponly'));
    }
  });

  it('should not send SameSite=none property on non-secure context', () => {
    const cookies = Cookies(
      {
        secure: false,
        headers: {
          'user-agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.3945.29 Safari/537.36',
        },
      },
      null,
      { sameSite: 'none' }
    );
    const opts: CookieSetOptions = {
      signed: 1,
    };
    cookies.set('foo', 'hello', opts);

    assert(opts.signed === 1);
    assert(opts.secure === undefined);
    assert(cookies.ctx.response.headers['set-cookie'].join(';').match(/foo=hello/));
    for (const str of cookies.ctx.response.headers['set-cookie']) {
      assert(str.includes('; path=/; httponly'));
    }
  });

  it('should not send SameSite=none property on options.secure = false', () => {
    const cookies = Cookies(
      {
        secure: true,
        headers: {
          'user-agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 13_0 like Mac OS X) AppleWebKit/602.1.38 (KHTML, like Gecko) Version/66.6 Mobile/14A5297c Safari/602.1',
        },
      },
      { secure: true },
      { sameSite: 'none' }
    );

    const opts: CookieSetOptions = {
      signed: 1,
      secure: false,
    };
    cookies.set('foo', 'hello', opts);

    assert(opts.signed === 1);
    assert(opts.secure === false);
    assert(cookies.ctx.response.headers['set-cookie'].join(';').match(/foo=hello/));
    for (const str of cookies.ctx.response.headers['set-cookie']) {
      assert(str.includes('; path=/; httponly'));
    }
  });

  describe('opts.partitioned', () => {
    it('should not send partitioned property on incompatible clients', () => {
      const userAgents = [
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML%2C like Gecko) Chrome/62.0.3202.94 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML%2C like Gecko) Chrome/52.0.2723.2 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/100.36 (KHTML, like Gecko) Safari/100.36',
      ];
      for (const ua of userAgents) {
        const cookies = Cookies(
          {
            secure: true,
            headers: {
              'user-agent': ua,
            },
          },
          { secure: true },
          { partitioned: true, sameSite: 'None' }
        );
        const opts: CookieSetOptions = {
          signed: 1,
        };
        cookies.set('foo', 'hello', opts);

        assert(opts.signed === 1);
        assert(opts.secure === undefined);
        assert(cookies.ctx.response.headers['set-cookie'].join(';').match(/foo=hello/));
        for (const str of cookies.ctx.response.headers['set-cookie']) {
          assert(!str.includes('partitioned'));
        }
      }
    });

    it('should not send partitioned property on Chrome < 118', () => {
      const cookies = Cookies(
        {
          secure: true,
          headers: {
            'user-agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.3945.29 Safari/537.36',
          },
        },
        { secure: true },
        { partitioned: true, sameSite: 'None' }
      );
      const opts: CookieSetOptions = {
        signed: 1,
      };
      cookies.set('foo', 'hello', opts);

      assert(opts.signed === 1);
      assert(opts.secure === undefined);
      assert(cookies.ctx.response.headers['set-cookie'].join(';').match(/foo=hello/));
      for (const str of cookies.ctx.response.headers['set-cookie']) {
        assert(str.includes('; path=/; samesite=none; secure; httponly'));
      }
    });

    it('should send partitioned property on Chrome >= 118', () => {
      let cookies = Cookies(
        {
          secure: true,
          headers: {
            'user-agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.3945.29 Safari/537.36',
          },
        },
        { secure: true },
        { partitioned: true, sameSite: 'None' }
      );
      const opts: CookieSetOptions = {
        signed: 1,
      };
      cookies.set('foo', 'hello', opts);

      assert(opts.signed === 1);
      assert(opts.secure === undefined);
      assert(cookies.ctx.response.headers['set-cookie'].join(';').match(/foo=hello/));
      for (const str of cookies.ctx.response.headers['set-cookie']) {
        assert(str.includes('; path=/; samesite=none; secure; httponly; partitioned'));
      }

      cookies = Cookies(
        {
          secure: true,
          headers: {
            'user-agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.3945.29 Safari/537.36',
          },
        },
        { secure: true },
        { partitioned: true, sameSite: 'None' }
      );
      cookies.set('foo', 'hello', opts);

      assert(opts.signed === 1);
      assert(opts.secure === undefined);
      assert(cookies.ctx.response.headers['set-cookie'].join(';').match(/foo=hello/));
      for (const str of cookies.ctx.response.headers['set-cookie']) {
        assert(str.includes('; path=/; samesite=none; secure; httponly; partitioned'));
      }

      // empty user-agent
      cookies = Cookies(
        {
          secure: true,
          headers: {
            'user-agent': '',
          },
        },
        { secure: true },
        { partitioned: true, sameSite: 'None' }
      );
      cookies.set('foo', 'hello', opts);

      assert(opts.signed === 1);
      assert(opts.secure === undefined);
      assert(cookies.ctx.response.headers['set-cookie'].join(';').match(/foo=hello/));
      for (const str of cookies.ctx.response.headers['set-cookie']) {
        assert(str.includes('; path=/; samesite=none; secure; httponly; partitioned'));
      }

      cookies = Cookies(
        {
          secure: true,
          headers: {
            'user-agent': '',
          },
        },
        { secure: true }
      );
      cookies.set('foo', 'hello', {
        sameSite: 'None',
        partitioned: true,
      });

      assert(opts.signed === 1);
      assert(opts.secure === undefined);
      assert(cookies.ctx.response.headers['set-cookie'].join(';').match(/foo=hello/));
      for (const str of cookies.ctx.response.headers['set-cookie']) {
        assert(str.includes('; path=/; samesite=none; secure; httponly; partitioned'));
      }
    });

    it('should not send SameSite=none property on non-secure context', () => {
      const cookies = Cookies(
        {
          secure: false,
          headers: {
            'user-agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.3945.29 Safari/537.36',
          },
        },
        null,
        { partitioned: true, sameSite: 'None' }
      );
      const opts: CookieSetOptions = {
        signed: 1,
      };
      cookies.set('foo', 'hello', opts);

      assert(opts.signed === 1);
      assert(opts.secure === undefined);
      assert(cookies.ctx.response.headers['set-cookie'].join(';').match(/foo=hello/));
      for (const str of cookies.ctx.response.headers['set-cookie']) {
        assert(str.includes('; path=/; httponly'));
      }
    });

    it('should remove unpartitioned property first', () => {
      const cookies = Cookies(
        {
          secure: true,
          headers: {
            'user-agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.3945.29 Safari/537.36',
          },
        },
        { secure: true },
        { partitioned: true, removeUnpartitioned: true, sameSite: 'None' }
      );
      const opts: CookieSetOptions = {
        signed: 1,
      };
      cookies.set('foo', 'hello', opts);

      assert(opts.signed === 1);
      assert(opts.secure === undefined);
      const headers = cookies.ctx.response.headers['set-cookie'];
      // console.log(headers);
      assert.equal(headers.length, 4);
      assert.equal(headers[0], 'foo=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=none; secure; httponly');
      assert.equal(
        headers[1],
        'foo.sig=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=none; secure; httponly'
      );
      assert.equal(headers[2], 'foo=hello; path=/; samesite=none; secure; httponly; partitioned');
      assert.equal(
        headers[3],
        'foo.sig=ZWbaA4bWk8ByBuYVgfmJ2DMvhhS3sOctMbfXAQ2vnwI; path=/; samesite=none; secure; httponly; partitioned'
      );
    });

    it('should remove unpartitioned property first when opts.secure = true and signed = false', () => {
      const cookies = Cookies(
        {
          secure: true,
          headers: {
            'user-agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.3945.29 Safari/537.36',
          },
        },
        { secure: true },
        { partitioned: true, removeUnpartitioned: true, sameSite: 'None' }
      );
      const opts: CookieSetOptions = {
        secure: true,
        signed: false,
      };
      cookies.set('foo', 'hello', opts);

      assert(opts.signed === false);
      assert(opts.secure === true);
      const headers = cookies.ctx.response.headers['set-cookie'];
      // console.log(headers);
      assert.equal(headers.length, 2);
      assert.equal(headers[0], 'foo=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=none; secure; httponly');
      assert.equal(headers[1], 'foo=hello; path=/; samesite=none; secure; httponly; partitioned');
    });

    it('should remove unpartitioned property first with overwrite = true', () => {
      const cookies = Cookies(
        {
          secure: true,
          headers: {
            'user-agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.3945.29 Safari/537.36',
          },
        },
        { secure: true },
        { partitioned: true, removeUnpartitioned: true, overwrite: true, sameSite: 'none' }
      );
      const opts: CookieSetOptions = {
        signed: 1,
      };
      cookies.set('foo', 'hello2222', opts);
      cookies.set('foo', 'hello', opts);

      assert(opts.signed === 1);
      assert(opts.secure === undefined);
      const headers = cookies.ctx.response.headers['set-cookie'];
      assert.equal(headers.length, 4);
      assert.equal(headers[0], 'foo=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=none; secure; httponly');
      assert.equal(
        headers[1],
        'foo.sig=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=none; secure; httponly'
      );
      assert.equal(headers[2], 'foo=hello; path=/; samesite=none; secure; httponly; partitioned');
      assert.equal(
        headers[3],
        'foo.sig=ZWbaA4bWk8ByBuYVgfmJ2DMvhhS3sOctMbfXAQ2vnwI; path=/; samesite=none; secure; httponly; partitioned'
      );
    });

    it('should not set partitioned property when secure = false', () => {
      const cookies = Cookies(
        {
          secure: true,
          headers: {
            'user-agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.3945.29 Safari/537.36',
          },
        },
        { secure: true },
        { partitioned: true, removeUnpartitioned: true, sameSite: 'None' }
      );
      const opts: CookieSetOptions = {
        signed: 1,
        secure: false,
      };
      cookies.set('foo', 'hello', opts);

      assert(opts.signed === 1);
      const headers = cookies.ctx.response.headers['set-cookie'];
      assert.equal(headers.length, 2);
      assert.equal(headers[0], 'foo=hello; path=/; httponly');
      assert.equal(headers[1], 'foo.sig=ZWbaA4bWk8ByBuYVgfmJ2DMvhhS3sOctMbfXAQ2vnwI; path=/; httponly');
    });

    it('should not set partitioned property when sameSite != none', () => {
      const cookies = Cookies(
        {
          secure: true,
          headers: {
            'user-agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.3945.29 Safari/537.36',
          },
        },
        { secure: true },
        { partitioned: true, removeUnpartitioned: true }
      );
      const opts: CookieSetOptions = {
        signed: 1,
      };
      cookies.set('foo', 'hello', opts);

      assert(opts.signed === 1);
      const headers = cookies.ctx.response.headers['set-cookie'];
      assert.equal(headers.length, 2);
      assert.equal(headers[0], 'foo=hello; path=/; secure; httponly');
      assert.equal(headers[1], 'foo.sig=ZWbaA4bWk8ByBuYVgfmJ2DMvhhS3sOctMbfXAQ2vnwI; path=/; secure; httponly');
    });
  });

  describe('defaultCookieOptions.autoChips = true', () => {
    it('should not send partitioned property on incompatible clients', () => {
      const userAgents = [
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML%2C like Gecko) Chrome/62.0.3202.94 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML%2C like Gecko) Chrome/52.0.2723.2 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/100.36 (KHTML, like Gecko) Safari/100.36',
      ];
      for (const ua of userAgents) {
        const cookies = Cookies(
          {
            secure: true,
            headers: {
              'user-agent': ua,
            },
          },
          { secure: true },
          { autoChips: true, sameSite: 'None' }
        );
        const opts: CookieSetOptions = {
          signed: 1,
        };
        cookies.set('foo', 'hello', opts);

        assert(opts.signed === 1);
        assert(opts.secure === undefined);
        assert(cookies.ctx.response.headers['set-cookie'].join(';').match(/foo=hello/));
        for (const str of cookies.ctx.response.headers['set-cookie']) {
          assert(!str.includes('partitioned'));
        }
      }
    });

    it('should not send partitioned property on Chrome < 118', () => {
      const cookies = Cookies(
        {
          secure: true,
          headers: {
            'user-agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.3945.29 Safari/537.36',
          },
        },
        { secure: true },
        { autoChips: true, sameSite: 'None' }
      );
      const opts: CookieSetOptions = {
        signed: 1,
      };
      cookies.set('foo', 'hello', opts);

      assert(opts.signed === 1);
      assert(opts.secure === undefined);
      assert(cookies.ctx.response.headers['set-cookie'].join(';').match(/foo=hello/));
      for (const str of cookies.ctx.response.headers['set-cookie']) {
        assert(str.includes('; path=/; samesite=none; secure; httponly'));
      }
    });

    it('should send partitioned property on Chrome >= 118', () => {
      let cookies = Cookies(
        {
          secure: true,
          headers: {
            'user-agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.3945.29 Safari/537.36',
          },
        },
        { secure: true },
        { autoChips: true, sameSite: 'None' }
      );
      const opts: CookieSetOptions = {
        signed: 1,
      };
      cookies.set('foo', 'hello', opts);

      assert(opts.signed === 1);
      assert(opts.secure === undefined);
      let setCookies = cookies.ctx.response.headers['set-cookie'];
      assert.equal(setCookies.length, 4);
      assert.equal(setCookies[0], '_CHIPS-foo=hello; path=/; samesite=none; secure; httponly; partitioned');
      assert.equal(
        setCookies[1],
        '_CHIPS-foo.sig=G4Idm9Wdp_vfCnUbOpQG284o22SgTe88SUmG6QW1ylk; path=/; samesite=none; secure; httponly; partitioned'
      );
      assert.equal(setCookies[2], 'foo=hello; path=/; samesite=none; secure; httponly');
      assert.equal(
        setCookies[3],
        'foo.sig=ZWbaA4bWk8ByBuYVgfmJ2DMvhhS3sOctMbfXAQ2vnwI; path=/; samesite=none; secure; httponly'
      );

      cookies = Cookies(
        {
          secure: true,
          headers: {
            'user-agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.3945.29 Safari/537.36',
          },
        },
        { secure: true },
        { autoChips: true, sameSite: 'None' }
      );
      cookies.set('foo', 'hello', opts);

      assert(opts.signed === 1);
      assert(opts.secure === undefined);
      setCookies = cookies.ctx.response.headers['set-cookie'];
      assert.equal(setCookies[0], '_CHIPS-foo=hello; path=/; samesite=none; secure; httponly; partitioned');
      assert.equal(
        setCookies[1],
        '_CHIPS-foo.sig=G4Idm9Wdp_vfCnUbOpQG284o22SgTe88SUmG6QW1ylk; path=/; samesite=none; secure; httponly; partitioned'
      );
      assert.equal(setCookies[2], 'foo=hello; path=/; samesite=none; secure; httponly');
      assert.equal(
        setCookies[3],
        'foo.sig=ZWbaA4bWk8ByBuYVgfmJ2DMvhhS3sOctMbfXAQ2vnwI; path=/; samesite=none; secure; httponly'
      );

      // empty user-agent
      // disable autoChips if partitioned enable
      cookies = Cookies(
        {
          secure: true,
          headers: {
            'user-agent': '',
          },
        },
        { secure: true },
        { autoChips: true, partitioned: true, removeUnpartitioned: true, sameSite: 'None' }
      );
      cookies.set('foo', 'hello', opts);

      assert(opts.signed === 1);
      assert(opts.secure === undefined);
      setCookies = cookies.ctx.response.headers['set-cookie'];
      assert.equal(
        setCookies[0],
        'foo=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=none; secure; httponly'
      );
      assert.equal(
        setCookies[1],
        'foo.sig=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=none; secure; httponly'
      );
      assert.equal(setCookies[2], 'foo=hello; path=/; samesite=none; secure; httponly; partitioned');
      assert.equal(
        setCookies[3],
        'foo.sig=ZWbaA4bWk8ByBuYVgfmJ2DMvhhS3sOctMbfXAQ2vnwI; path=/; samesite=none; secure; httponly; partitioned'
      );

      cookies = Cookies(
        {
          secure: true,
          headers: {
            'user-agent': '',
          },
        },
        { secure: true },
        { autoChips: true }
      );
      cookies.set('foo', 'hello', {
        sameSite: 'None',
        // ignore removeUnpartitioned options
        removeUnpartitioned: true,
      });

      assert(opts.signed === 1);
      assert(opts.secure === undefined);
      setCookies = cookies.ctx.response.headers['set-cookie'];
      assert.equal(setCookies[0], '_CHIPS-foo=hello; path=/; samesite=none; secure; httponly; partitioned');
      assert.equal(
        setCookies[1],
        '_CHIPS-foo.sig=G4Idm9Wdp_vfCnUbOpQG284o22SgTe88SUmG6QW1ylk; path=/; samesite=none; secure; httponly; partitioned'
      );
      assert.equal(setCookies[2], 'foo=hello; path=/; samesite=none; secure; httponly');
      assert.equal(
        setCookies[3],
        'foo.sig=ZWbaA4bWk8ByBuYVgfmJ2DMvhhS3sOctMbfXAQ2vnwI; path=/; samesite=none; secure; httponly'
      );

      // read from cookie
      cookies = Cookies(
        {
          secure: true,
          headers: {
            cookie:
              '_CHIPS-foo=hello; _CHIPS-foo.sig=G4Idm9Wdp_vfCnUbOpQG284o22SgTe88SUmG6QW1ylk; foo=hello; foo.sig=ZWbaA4bWk8ByBuYVgfmJ2DMvhhS3sOctMbfXAQ2vnwI',
          },
        },
        { secure: true },
        { autoChips: true }
      );
      assert.equal(cookies.get('foo'), 'hello');
      assert.equal(cookies.get('_CHIPS-foo'), 'hello');
      cookies = Cookies(
        {
          secure: true,
          headers: {
            cookie: '_CHIPS-foo=hello; _CHIPS-foo.sig=G4Idm9Wdp_vfCnUbOpQG284o22SgTe88SUmG6QW1ylk',
          },
        },
        { secure: true },
        { autoChips: true }
      );
      assert.equal(cookies.get('foo', { signed: true }), 'hello');
      assert.equal(cookies.get('foo', { signed: false }), 'hello');
      assert.equal(cookies.get('foo'), 'hello');

      cookies = Cookies(
        {
          secure: true,
          headers: {
            cookie: '_CHIPS-foo=hello; _CHIPS-foo.sig=G4Idm9Wdp_vfCnUbOpQG284o22SgTe88SUmG6QW1ylk-invalid',
          },
        },
        { secure: true },
        { autoChips: true }
      );
      assert.equal(cookies.get('foo', { signed: true }), undefined);
      assert.equal(cookies.get('foo', { signed: false }), 'hello');
      assert.equal(cookies.get('foo'), undefined);
      cookies = Cookies(
        {
          secure: true,
          headers: {
            cookie: '_CHIPS-foo=hello',
          },
        },
        { secure: true },
        { autoChips: true }
      );
      assert.equal(cookies.get('foo', { signed: true }), undefined);
      assert.equal(cookies.get('foo', { signed: false }), 'hello');
      assert.equal(cookies.get('foo'), undefined);
      cookies = Cookies(
        {
          secure: true,
          headers: {
            cookie: '_CHIPS-foo=hello; foo=',
          },
        },
        { secure: true },
        { autoChips: true }
      );
      assert.equal(cookies.get('foo', { signed: true }), undefined);
      assert.equal(cookies.get('foo', { signed: false }), '');
      assert.equal(cookies.get('foo'), undefined);
    });

    it('should not send SameSite=none property on non-secure context', () => {
      const cookies = Cookies(
        {
          secure: false,
          headers: {
            'user-agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.3945.29 Safari/537.36',
          },
        },
        null,
        { autoChips: true, sameSite: 'None' }
      );
      const opts: CookieSetOptions = {
        signed: 1,
      };
      cookies.set('foo', 'hello', opts);

      assert(opts.signed === 1);
      assert(opts.secure === undefined);
      assert(cookies.ctx.response.headers['set-cookie'].join(';').match(/foo=hello/));
      for (const str of cookies.ctx.response.headers['set-cookie']) {
        assert(str.includes('; path=/; httponly'));
      }
    });

    it('should disable autoChips when partitioned=true', () => {
      const cookies = Cookies(
        {
          secure: true,
          headers: {
            'user-agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.3945.29 Safari/537.36',
          },
        },
        { secure: true },
        { autoChips: true, partitioned: true, sameSite: 'None' }
      );
      const opts: CookieSetOptions = {
        signed: 1,
      };
      cookies.set('foo', 'hello', opts);

      assert(opts.signed === 1);
      assert(opts.secure === undefined);
      const headers = cookies.ctx.response.headers['set-cookie'];
      // console.log(headers);
      assert.equal(headers.length, 2);
      assert.equal(headers[0], 'foo=hello; path=/; samesite=none; secure; httponly; partitioned');
      assert.equal(
        headers[1],
        'foo.sig=ZWbaA4bWk8ByBuYVgfmJ2DMvhhS3sOctMbfXAQ2vnwI; path=/; samesite=none; secure; httponly; partitioned'
      );
    });

    it('should ignore remove unpartitioned property', () => {
      const cookies = Cookies(
        {
          secure: true,
          headers: {
            'user-agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.3945.29 Safari/537.36',
          },
        },
        { secure: true },
        { autoChips: true, partitioned: false, removeUnpartitioned: true, sameSite: 'None' }
      );
      const opts: CookieSetOptions = {
        signed: 1,
      };
      cookies.set('foo', 'hello', opts);

      assert(opts.signed === 1);
      assert(opts.secure === undefined);
      const headers = cookies.ctx.response.headers['set-cookie'];
      // console.log(headers);
      assert.equal(headers.length, 4);
      assert.equal(headers[0], '_CHIPS-foo=hello; path=/; samesite=none; secure; httponly; partitioned');
      assert.equal(
        headers[1],
        '_CHIPS-foo.sig=G4Idm9Wdp_vfCnUbOpQG284o22SgTe88SUmG6QW1ylk; path=/; samesite=none; secure; httponly; partitioned'
      );
      assert.equal(headers[2], 'foo=hello; path=/; samesite=none; secure; httponly');
      assert.equal(
        headers[3],
        'foo.sig=ZWbaA4bWk8ByBuYVgfmJ2DMvhhS3sOctMbfXAQ2vnwI; path=/; samesite=none; secure; httponly'
      );
    });

    it('should ignore remove unpartitioned property with different paths', () => {
      const cookies = Cookies(
        {
          secure: true,
          headers: {
            'user-agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.3945.29 Safari/537.36',
          },
        },
        { secure: true },
        { autoChips: true, partitioned: false, removeUnpartitioned: true, sameSite: 'None' }
      );
      const opts: CookieSetOptions = {
        signed: 1,
      };
      cookies.set('foo', 'hello', opts);
      cookies.set('foo', 'hello', {
        ...opts,
        path: '/path2',
      });

      assert(opts.signed === 1);
      assert(opts.secure === undefined);
      const headers = cookies.ctx.response.headers['set-cookie'];
      assert.deepEqual(headers, [
        '_CHIPS-foo=hello; path=/; samesite=none; secure; httponly; partitioned',
        '_CHIPS-foo.sig=G4Idm9Wdp_vfCnUbOpQG284o22SgTe88SUmG6QW1ylk; path=/; samesite=none; secure; httponly; partitioned',
        'foo=hello; path=/; samesite=none; secure; httponly',
        'foo.sig=ZWbaA4bWk8ByBuYVgfmJ2DMvhhS3sOctMbfXAQ2vnwI; path=/; samesite=none; secure; httponly',
        '_CHIPS-foo=hello; path=/path2; samesite=none; secure; httponly; partitioned',
        '_CHIPS-foo.sig=G4Idm9Wdp_vfCnUbOpQG284o22SgTe88SUmG6QW1ylk; path=/path2; samesite=none; secure; httponly; partitioned',
        'foo=hello; path=/path2; samesite=none; secure; httponly',
        'foo.sig=ZWbaA4bWk8ByBuYVgfmJ2DMvhhS3sOctMbfXAQ2vnwI; path=/path2; samesite=none; secure; httponly',
      ]);
    });

    it('should ignore remove unpartitioned property when autoChips = true and signed = false', () => {
      const cookies = Cookies(
        {
          secure: true,
          headers: {
            'user-agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.3945.29 Safari/537.36',
          },
        },
        { secure: true },
        { autoChips: true, partitioned: false, removeUnpartitioned: true, sameSite: 'None' }
      );
      const opts: CookieSetOptions = {
        secure: true,
        signed: false,
      };
      cookies.set('foo', 'hello', opts);

      assert(opts.signed === false);
      assert(opts.secure === true);
      const headers = cookies.ctx.response.headers['set-cookie'];
      // console.log(headers);
      assert.equal(headers.length, 2);
      assert.equal(headers[0], '_CHIPS-foo=hello; path=/; samesite=none; secure; httponly; partitioned');
      assert.equal(headers[1], 'foo=hello; path=/; samesite=none; secure; httponly');
    });

    it('should work on unpartitioned = true and partitioned = true with different paths', () => {
      const cookies = Cookies(
        {
          secure: true,
          headers: {
            'user-agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.3945.29 Safari/537.36',
          },
        },
        { secure: true },
        { partitioned: true, removeUnpartitioned: true, sameSite: 'None' }
      );
      cookies.set('foo', 'hello', {
        signed: 1,
      });
      cookies.set('foo', 'hello', {
        signed: 1,
        path: '/path1',
      });
      cookies.set('foo', 'hello', {
        signed: 1,
        path: '/path2',
      });
      cookies.set('foo', 'hello', {
        signed: 1,
        path: '/path3',
      });

      const headers = cookies.ctx.response.headers['set-cookie'];
      assert.deepEqual(headers, [
        'foo=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=none; secure; httponly',
        'foo.sig=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=none; secure; httponly',
        'foo=hello; path=/; samesite=none; secure; httponly; partitioned',
        'foo.sig=ZWbaA4bWk8ByBuYVgfmJ2DMvhhS3sOctMbfXAQ2vnwI; path=/; samesite=none; secure; httponly; partitioned',
        'foo=; path=/path1; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=none; secure; httponly',
        'foo.sig=; path=/path1; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=none; secure; httponly',
        'foo=hello; path=/path1; samesite=none; secure; httponly; partitioned',
        'foo.sig=ZWbaA4bWk8ByBuYVgfmJ2DMvhhS3sOctMbfXAQ2vnwI; path=/path1; samesite=none; secure; httponly; partitioned',
        'foo=; path=/path2; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=none; secure; httponly',
        'foo.sig=; path=/path2; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=none; secure; httponly',
        'foo=hello; path=/path2; samesite=none; secure; httponly; partitioned',
        'foo.sig=ZWbaA4bWk8ByBuYVgfmJ2DMvhhS3sOctMbfXAQ2vnwI; path=/path2; samesite=none; secure; httponly; partitioned',
        'foo=; path=/path3; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=none; secure; httponly',
        'foo.sig=; path=/path3; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=none; secure; httponly',
        'foo=hello; path=/path3; samesite=none; secure; httponly; partitioned',
        'foo.sig=ZWbaA4bWk8ByBuYVgfmJ2DMvhhS3sOctMbfXAQ2vnwI; path=/path3; samesite=none; secure; httponly; partitioned',
      ]);
    });

    it('should work on unpartitioned = true and partitioned = true with different null path', () => {
      const cookies = Cookies(
        {
          secure: true,
          headers: {
            'user-agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.3945.29 Safari/537.36',
          },
        },
        { secure: true },
        { partitioned: true, removeUnpartitioned: true, sameSite: 'None' }
      );
      cookies.set('foo', 'hello', {
        signed: 1,
      });
      cookies.set('foo', 'hello', {
        signed: 1,
        path: '/path1',
      });
      cookies.set('foo', 'hello', {
        signed: 1,
        path: '/path2',
      });
      cookies.set('foo', 'hello', {
        signed: 1,
        path: null,
      });

      const headers = cookies.ctx.response.headers['set-cookie'];
      assert.deepEqual(headers, [
        'foo=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=none; secure; httponly',
        'foo=hello; path=/; samesite=none; secure; httponly; partitioned',
        'foo=; path=/path1; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=none; secure; httponly',
        'foo=hello; path=/path1; samesite=none; secure; httponly; partitioned',
        'foo=; path=/path2; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=none; secure; httponly',
        'foo=hello; path=/path2; samesite=none; secure; httponly; partitioned',
        'foo=; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=none; secure; httponly',
        'foo.sig=; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=none; secure; httponly',
        'foo=hello; samesite=none; secure; httponly; partitioned',
        'foo.sig=ZWbaA4bWk8ByBuYVgfmJ2DMvhhS3sOctMbfXAQ2vnwI; samesite=none; secure; httponly; partitioned',
      ]);
    });

    it('should work with overwrite = true', () => {
      const cookies = Cookies(
        {
          secure: true,
          headers: {
            'user-agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.3945.29 Safari/537.36',
          },
        },
        { secure: true },
        { autoChips: true, overwrite: true, sameSite: 'none' }
      );
      const opts: CookieSetOptions = {
        signed: 1,
      };
      cookies.set('foo', 'hello2222', opts);
      cookies.set('foo', 'hello', opts);

      assert(opts.signed === 1);
      assert(opts.secure === undefined);
      const headers = cookies.ctx.response.headers['set-cookie'];
      assert.equal(headers.length, 4);
      assert.equal(headers[0], '_CHIPS-foo=hello; path=/; samesite=none; secure; httponly; partitioned');
      assert.equal(
        headers[1],
        '_CHIPS-foo.sig=G4Idm9Wdp_vfCnUbOpQG284o22SgTe88SUmG6QW1ylk; path=/; samesite=none; secure; httponly; partitioned'
      );
      assert.equal(headers[2], 'foo=hello; path=/; samesite=none; secure; httponly');
      assert.equal(
        headers[3],
        'foo.sig=ZWbaA4bWk8ByBuYVgfmJ2DMvhhS3sOctMbfXAQ2vnwI; path=/; samesite=none; secure; httponly'
      );
    });

    it('should not set partitioned property when secure = false', () => {
      const cookies = Cookies(
        {
          secure: true,
          headers: {
            'user-agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.3945.29 Safari/537.36',
          },
        },
        { secure: true },
        { autoChips: true, sameSite: 'None' }
      );
      const opts: CookieSetOptions = {
        signed: 1,
        secure: false,
      };
      cookies.set('foo', 'hello', opts);

      assert(opts.signed === 1);
      const headers = cookies.ctx.response.headers['set-cookie'];
      assert.equal(headers.length, 2);
      assert.equal(headers[0], 'foo=hello; path=/; httponly');
      assert.equal(headers[1], 'foo.sig=ZWbaA4bWk8ByBuYVgfmJ2DMvhhS3sOctMbfXAQ2vnwI; path=/; httponly');
    });

    it('should not set partitioned property when sameSite != none', () => {
      const cookies = Cookies(
        {
          secure: true,
          headers: {
            'user-agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.3945.29 Safari/537.36',
          },
        },
        { secure: true },
        { autoChips: true }
      );
      const opts: CookieSetOptions = {
        signed: 1,
      };
      cookies.set('foo', 'hello', opts);

      assert(opts.signed === 1);
      const headers = cookies.ctx.response.headers['set-cookie'];
      assert.equal(headers.length, 2);
      assert.equal(headers[0], 'foo=hello; path=/; secure; httponly');
      assert.equal(headers[1], 'foo.sig=ZWbaA4bWk8ByBuYVgfmJ2DMvhhS3sOctMbfXAQ2vnwI; path=/; secure; httponly');
    });
  });
});
