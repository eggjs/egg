import { strict as assert } from 'node:assert';

import { describe, it } from 'vitest';

import { Cookie } from '../src/index.ts';

describe('test/cookie.test.ts', () => {
  it('create cookies contains invalid string error should throw', () => {
    assert.throws(() => new Cookie('中文', 'value'), /argument name is invalid/);
    assert.throws(() => new Cookie('name', '中文'), /argument value is invalid/);
    assert.throws(() => new Cookie('name', 'value', { path: '中文' }), /argument option path is invalid/);
    assert.throws(() => new Cookie('name', 'value', { domain: '中文' }), /argument option domain is invalid/);
  });

  it('set expires to 0 if value not present', () => {
    assert.equal(new Cookie('name', null).attrs.expires!.getTime(), 0);
  });

  describe('toString()', () => {
    it('return name=value', () => {
      assert.equal(new Cookie('name', 'value').toString(), 'name=value');
    });
  });

  describe('toHeader()', () => {
    it('return name=value;params', () => {
      assert.match(
        new Cookie('name', 'value', {
          secure: true,
          maxAge: 1000,
          domain: 'eggjs.org',
          path: '/',
          httpOnly: true,
        }).toHeader(),
        /^name=value; path=\/; max-age=1; expires=(.*?)GMT; domain=eggjs\.org; secure; httponly$/
      );
    });

    it('no emit error once setting secure=true in none ssl environment', () => {
      new Cookie('name', 'value', {
        secure: true,
        ignoreSecureError: true,
      });
    });

    it('no emit error once setting secure=true in none ssl environment', () => {
      const exceptionMessage = 'Cannot send secure cookie over unencrypted connection';
      try {
        new Cookie('name', 'value', {
          secure: true,
        });
      } catch (error) {
        assert.strictEqual((error as Error).message, exceptionMessage);
      }

      try {
        new Cookie('name', 'value', {
          secure: true,
          ignoreSecureError: false,
        });
      } catch (error) {
        assert.strictEqual((error as Error).message, exceptionMessage);
      }
    });

    it('set domain when domain is a function', () => {
      assert(
        new Cookie('name', 'value', {
          secure: true,
          maxAge: 1000,
          domain: () => 'eggjs.org',
          path: '/',
          httpOnly: true,
        })
          .toHeader()
          .match(/^name=value; path=\/; max-age=1; expires=(.*?)GMT; domain=eggjs\.org; secure; httponly$/)
      );
    });

    it('do not set path when set path to null', () => {
      const header = new Cookie('name', 'value', {
        path: null,
      }).toHeader();
      assert.doesNotMatch(header, /path=/);
    });

    it('do not set httponly when set httpOnly to false', () => {
      const header = new Cookie('name', 'value', {
        httpOnly: false,
      }).toHeader();
      assert.doesNotMatch(header, /httponly/);
    });
  });

  describe('maxAge', () => {
    it('maxAge overwrite expires', () => {
      const expires = new Date('2020-01-01');
      let header = new Cookie('name', 'value', {
        secure: true,
        expires,
        domain: 'eggjs.org',
        path: '/',
        httpOnly: true,
      }).toHeader();
      assert.match(header, /expires=Wed, 01 Jan 2020 00:00:00 GMT/);
      header = new Cookie('name', 'value', {
        secure: true,
        maxAge: 1000,
        expires,
        domain: 'eggjs.org',
        path: '/',
        httpOnly: true,
      }).toHeader();
      assert(!header.match(/expires=Wed, 01 Jan 2020 00:00:00 GMT/));
    });

    it('ignore maxage NaN', () => {
      const header = new Cookie('name', 'value', {
        secure: true,
        maxAge: 'session' as any,
        domain: 'eggjs.org',
        path: '/',
        httpOnly: true,
      }).toHeader();
      assert(!header.includes('max-age'));
      assert(!header.includes('expires'));
    });

    it('ignore maxage 0', () => {
      // In previous implementations, maxAge = 0 was considered unnecessary to set this header
      const header = new Cookie('name', 'value', {
        secure: true,
        maxAge: 0,
        domain: 'eggjs.org',
        path: '/',
        httpOnly: true,
      }).toHeader();
      assert(!header.includes('max-age'));
      assert(!header.includes('expires'));
    });
  });

  describe('sameSite', () => {
    it('should default to false', () => {
      const cookie = new Cookie('foo', 'bar');
      assert.equal(cookie.attrs.sameSite, false);
    });

    it('should throw on invalid value', () => {
      assert.throws(() => {
        new Cookie('foo', 'bar', { sameSite: 'foo' });
      }, /argument option sameSite is invalid/);
    });

    describe('when set to falsy values', () => {
      it('should not add "samesite" attribute in header', () => {
        const falsyValues = [false, 0, '', null, undefined, NaN];
        falsyValues.forEach(falsy => {
          const cookie = new Cookie('foo', 'bar', { sameSite: falsy as any });
          assert.ok(Object.is(cookie.attrs.sameSite, falsy));
          assert.equal(cookie.toHeader(), 'foo=bar; path=/; httponly');
        });
      });
    });

    describe('when set to "true"', () => {
      it('should set "samesite=strict" attribute in header', () => {
        const cookie = new Cookie('foo', 'bar', { sameSite: true });
        assert.equal(cookie.attrs.sameSite, true);
        assert.equal(cookie.toHeader(), 'foo=bar; path=/; samesite=strict; httponly');
      });
    });

    describe('when set to "none"', () => {
      it('should set "samesite=none" attribute in header', () => {
        {
          const cookie = new Cookie('foo', 'bar', { sameSite: 'none' });
          assert.equal(cookie.toHeader(), 'foo=bar; path=/; samesite=none; httponly');
        }
        {
          const cookie = new Cookie('foo', 'bar', { sameSite: 'None' });
          assert.equal(cookie.toHeader(), 'foo=bar; path=/; samesite=none; httponly');
        }
      });
    });

    describe('when set to "lax"', () => {
      it('should set "samesite=lax" attribute in header', () => {
        {
          const cookie = new Cookie('foo', 'bar', { sameSite: 'lax' });
          assert.equal(cookie.toHeader(), 'foo=bar; path=/; samesite=lax; httponly');
        }
        {
          const cookie = new Cookie('foo', 'bar', { sameSite: 'Lax' });
          assert.equal(cookie.toHeader(), 'foo=bar; path=/; samesite=lax; httponly');
        }
      });
    });

    describe('when set to "strict"', () => {
      it('should set "samesite=strict" attribute in header', () => {
        {
          const cookie = new Cookie('foo', 'bar', { sameSite: 'strict' });
          assert.equal(cookie.toHeader(), 'foo=bar; path=/; samesite=strict; httponly');
        }
        {
          const cookie = new Cookie('foo', 'bar', { sameSite: 'Strict' });
          assert.equal(cookie.toHeader(), 'foo=bar; path=/; samesite=strict; httponly');
        }
      });
    });
  });

  describe('priority', () => {
    it('should set the .priority property', () => {
      const cookie = new Cookie('foo', 'bar', { priority: 'low' });
      assert.strictEqual(cookie.attrs.priority, 'low');
    });

    it('should default to undefined', () => {
      const cookie = new Cookie('foo', 'bar');
      assert.strictEqual(cookie.attrs.priority, undefined);
    });

    it('should throw on invalid value', () => {
      assert.throws(() => {
        new Cookie('foo', 'bar', { priority: 'foo' as any });
      }, /argument option priority is invalid/);
    });

    describe('when set to "low"', () => {
      it('should set "priority=low" attribute in header', () => {
        const cookie = new Cookie('foo', 'bar', { priority: 'low' });
        assert.strictEqual(cookie.toHeader(), 'foo=bar; path=/; priority=low; httponly');
      });
    });

    describe('when set to "medium"', () => {
      it('should set "priority=medium" attribute in header', () => {
        const cookie = new Cookie('foo', 'bar', { priority: 'medium' });
        assert.strictEqual(cookie.toHeader(), 'foo=bar; path=/; priority=medium; httponly');
      });
    });

    describe('when set to "high"', () => {
      it('should set "priority=high" attribute in header', () => {
        const cookie = new Cookie('foo', 'bar', { priority: 'high' });
        assert.strictEqual(cookie.toHeader(), 'foo=bar; path=/; priority=high; httponly');
      });
    });

    describe('when set to "HIGH"', () => {
      it('should set "priority=high" attribute in header', () => {
        const cookie = new Cookie('foo', 'bar', { priority: 'HIGH' });
        assert.strictEqual(cookie.toHeader(), 'foo=bar; path=/; priority=high; httponly');
      });
    });
  });
});
