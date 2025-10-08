import { describe, it, expect } from 'vitest';

import { pathMatching as match } from '../src/index.ts';

describe('index.test.ts', () => {
  it('options.match and options.ignore both present should throw', () => {
    expect(() => {
      match({ ignore: '/api', match: '/dashboard' });
    }).toThrow('options.match and options.ignore can not both present');
  });

  it('options.match and options.ignore both not present should always return true', () => {
    const fn = match({});
    expect(fn({})).toBe(true);
  });

  describe('match', () => {
    it('support string', () => {
      const fn = match({ match: '/api' });
      expect(fn({ path: '/api/hello' })).toBe(true);
      expect(fn({ path: '/api/' })).toBe(true);
      expect(fn({ path: '/api' })).toBe(true);
      expect(fn({ path: '/api1/hello' })).toBe(false);
      expect(fn({ path: '/api1' })).toBe(false);
    });

    it('support custom pathToRegexpModule', async () => {
      const pathToRegexpV8 = await import('path-to-regexp-v8');
      const fn = match({ match: '/api{/*path}', pathToRegexpModule: pathToRegexpV8 });
      expect(fn({ path: '/api/hello' })).toBe(true);
      expect(fn({ path: '/api/' })).toBe(true);
      expect(fn({ path: '/api' })).toBe(true);
      expect(fn({ path: '/api1/hello' })).toBe(false);
      expect(fn({ path: '/api1' })).toBe(false);
    });

    it('support regexp', () => {
      const fn = match({ match: /^\/api/ });
      expect(fn({ path: '/api/hello' })).toBe(true);
      expect(fn({ path: '/api/' })).toBe(true);
      expect(fn({ path: '/api' })).toBe(true);
      expect(fn({ path: '/api1/hello' })).toBe(true);
      expect(fn({ path: '/api1' })).toBe(true);
      expect(fn({ path: '/v1/api1' })).toBe(false);
    });

    it('support global regexp', () => {
      const fn = match({ match: /^\/api/g });
      expect(fn({ path: '/api/hello' })).toBe(true);
      expect(fn({ path: '/api/' })).toBe(true);
      expect(fn({ path: '/api' })).toBe(true);
      expect(fn({ path: '/api1/hello' })).toBe(true);
      expect(fn({ path: '/api1' })).toBe(true);
      expect(fn({ path: '/v1/api1' })).toBe(false);
    });

    it('support function', () => {
      const fn = match({
        match: ctx => ctx.path.startsWith('/api'),
      });
      expect(fn({ path: '/api/hello' })).toBe(true);
      expect(fn({ path: '/api/' })).toBe(true);
      expect(fn({ path: '/api' })).toBe(true);
      expect(fn({ path: '/api1/hello' })).toBe(true);
      expect(fn({ path: '/api1' })).toBe(true);
      expect(fn({ path: '/v1/api1' })).toBe(false);
    });

    it('support array', () => {
      const fn = match({
        match: [ctx => ctx.path.startsWith('/api'), '/ajax', /^\/foo$/],
      });
      expect(fn({ path: '/api/hello' })).toBe(true);
      expect(fn({ path: '/api/' })).toBe(true);
      expect(fn({ path: '/api' })).toBe(true);
      expect(fn({ path: '/api1/hello' })).toBe(true);
      expect(fn({ path: '/api1' })).toBe(true);
      expect(fn({ path: '/v1/api1' })).toBe(false);
      expect(fn({ path: '/ajax/hello' })).toBe(true);
      expect(fn({ path: '/foo' })).toBe(true);
    });
  });

  describe('ignore', () => {
    it('support string', () => {
      const fn = match({ ignore: '/api' });
      expect(fn({ path: '/api/hello' })).toBe(false);
      expect(fn({ path: '/api/' })).toBe(false);
      expect(fn({ path: '/api' })).toBe(false);
      expect(fn({ path: '/api1/hello' })).toBe(true);
      expect(fn({ path: '/api1' })).toBe(true);
    });

    it('support regexp', () => {
      const fn = match({ ignore: /^\/api/ });
      expect(fn({ path: '/api/hello' })).toBe(false);
      expect(fn({ path: '/api/' })).toBe(false);
      expect(fn({ path: '/api' })).toBe(false);
      expect(fn({ path: '/api1/hello' })).toBe(false);
      expect(fn({ path: '/api1' })).toBe(false);
      expect(fn({ path: '/v1/api1' })).toBe(true);
    });

    it('support global regexp', () => {
      const fn = match({ ignore: /^\/api/g });
      expect(fn({ path: '/api/hello' })).toBe(false);
      expect(fn({ path: '/api/' })).toBe(false);
      expect(fn({ path: '/api' })).toBe(false);
      expect(fn({ path: '/api1/hello' })).toBe(false);
      expect(fn({ path: '/api1' })).toBe(false);
      expect(fn({ path: '/v1/api1' })).toBe(true);
    });

    it('support function', () => {
      const fn = match({
        ignore: ctx => ctx.path.startsWith('/api'),
      });
      expect(fn({ path: '/api/hello' })).toBe(false);
      expect(fn({ path: '/api/' })).toBe(false);
      expect(fn({ path: '/api' })).toBe(false);
      expect(fn({ path: '/api1/hello' })).toBe(false);
      expect(fn({ path: '/api1' })).toBe(false);
      expect(fn({ path: '/v1/api1' })).toBe(true);
    });

    it('support array', () => {
      const fn = match({
        ignore: [ctx => ctx.path.startsWith('/api'), '/ajax', /^\/foo$/],
      });
      expect(fn({ path: '/api/hello' })).toBe(false);
      expect(fn({ path: '/api/' })).toBe(false);
      expect(fn({ path: '/api' })).toBe(false);
      expect(fn({ path: '/api1/hello' })).toBe(false);
      expect(fn({ path: '/api1' })).toBe(false);
      expect(fn({ path: '/v1/api1' })).toBe(true);
      expect(fn({ path: '/ajax/hello' })).toBe(false);
      expect(fn({ path: '/foo' })).toBe(false);
    });
  });
});
