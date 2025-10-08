import { strict as assert } from 'node:assert';
import { describe, it } from 'vitest';
import { pathMatching as match } from '../src/index.ts';

describe('egg-path-matching', () => {
  it('options.match and options.ignore both present should throw', () => {
    try {
      match({ ignore: '/api', match: '/dashboard' });
      throw new Error('should not exec');
    } catch (e: any) {
      assert.equal(e.message, 'options.match and options.ignore can not both present');
    }
  });

  it('options.match and options.ignore both not present should always return true', () => {
    const fn = match({});
    assert(fn({}) === true);
  });

  describe('match', () => {
    it('support string', () => {
      const fn = match({ match: '/api' });
      assert(fn({ path: '/api/hello' }) === true);
      assert(fn({ path: '/api/' }) === true);
      assert(fn({ path: '/api' }) === true);
      assert(fn({ path: '/api1/hello' }) === false);
      assert(fn({ path: '/api1' }) === false);
    });

    it('support custom pathToRegexpModule', async () => {
      const pathToRegexpV8 = await import('path-to-regexp-v8');
      const fn = match({ match: '/api{/*path}', pathToRegexpModule: pathToRegexpV8 });
      assert(fn({ path: '/api/hello' }) === true);
      assert(fn({ path: '/api/' }) === true);
      assert(fn({ path: '/api' }) === true);
      assert(fn({ path: '/api1/hello' }) === false);
      assert(fn({ path: '/api1' }) === false);
    });

    it('support regexp', () => {
      const fn = match({ match: /^\/api/ });
      assert(fn({ path: '/api/hello' }) === true);
      assert(fn({ path: '/api/' }) === true);
      assert(fn({ path: '/api' }) === true);
      assert(fn({ path: '/api1/hello' }) === true);
      assert(fn({ path: '/api1' }) === true);
      assert(fn({ path: '/v1/api1' }) === false);
    });

    it('support global regexp', () => {
      const fn = match({ match: /^\/api/g });
      assert(fn({ path: '/api/hello' }) === true);
      assert(fn({ path: '/api/' }) === true);
      assert(fn({ path: '/api' }) === true);
      assert(fn({ path: '/api1/hello' }) === true);
      assert(fn({ path: '/api1' }) === true);
      assert(fn({ path: '/v1/api1' }) === false);
    });

    it('support function', () => {
      const fn = match({
        match: ctx => ctx.path.startsWith('/api'),
      });
      assert(fn({ path: '/api/hello' }) === true);
      assert(fn({ path: '/api/' }) === true);
      assert(fn({ path: '/api' }) === true);
      assert(fn({ path: '/api1/hello' }) === true);
      assert(fn({ path: '/api1' }) === true);
      assert(fn({ path: '/v1/api1' }) === false);
    });

    it('support array', () => {
      const fn = match({
        match: [ctx => ctx.path.startsWith('/api'), '/ajax', /^\/foo$/],
      });
      assert(fn({ path: '/api/hello' }) === true);
      assert(fn({ path: '/api/' }) === true);
      assert(fn({ path: '/api' }) === true);
      assert(fn({ path: '/api1/hello' }) === true);
      assert(fn({ path: '/api1' }) === true);
      assert(fn({ path: '/v1/api1' }) === false);
      assert(fn({ path: '/ajax/hello' }) === true);
      assert(fn({ path: '/foo' }) === true);
    });
  });

  describe('ignore', () => {
    it('support string', () => {
      const fn = match({ ignore: '/api' });
      assert(fn({ path: '/api/hello' }) === false);
      assert(fn({ path: '/api/' }) === false);
      assert(fn({ path: '/api' }) === false);
      assert(fn({ path: '/api1/hello' }) === true);
      assert(fn({ path: '/api1' }) === true);
    });

    it('support regexp', () => {
      const fn = match({ ignore: /^\/api/ });
      assert(fn({ path: '/api/hello' }) === false);
      assert(fn({ path: '/api/' }) === false);
      assert(fn({ path: '/api' }) === false);
      assert(fn({ path: '/api1/hello' }) === false);
      assert(fn({ path: '/api1' }) === false);
      assert(fn({ path: '/v1/api1' }) === true);
    });

    it('support global regexp', () => {
      const fn = match({ ignore: /^\/api/g });
      assert(fn({ path: '/api/hello' }) === false);
      assert(fn({ path: '/api/' }) === false);
      assert(fn({ path: '/api' }) === false);
      assert(fn({ path: '/api1/hello' }) === false);
      assert(fn({ path: '/api1' }) === false);
      assert(fn({ path: '/v1/api1' }) === true);
    });

    it('support function', () => {
      const fn = match({
        ignore: ctx => ctx.path.startsWith('/api'),
      });
      assert(fn({ path: '/api/hello' }) === false);
      assert(fn({ path: '/api/' }) === false);
      assert(fn({ path: '/api' }) === false);
      assert(fn({ path: '/api1/hello' }) === false);
      assert(fn({ path: '/api1' }) === false);
      assert(fn({ path: '/v1/api1' }) === true);
    });

    it('support array', () => {
      const fn = match({
        ignore: [ctx => ctx.path.startsWith('/api'), '/ajax', /^\/foo$/],
      });
      assert(fn({ path: '/api/hello' }) === false);
      assert(fn({ path: '/api/' }) === false);
      assert(fn({ path: '/api' }) === false);
      assert(fn({ path: '/api1/hello' }) === false);
      assert(fn({ path: '/api1' }) === false);
      assert(fn({ path: '/v1/api1' }) === true);
      assert(fn({ path: '/ajax/hello' }) === false);
      assert(fn({ path: '/foo' }) === false);
    });
  });
});
