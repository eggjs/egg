import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, beforeAll } from 'vitest';

import { getFixtures } from './utils.ts';

describe('cookieDomain = function', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/ctoken'),
    });
    await app.ready();
  });
  afterAll(() => app.close());

  it('should auto set ctoken on GET request', () => {
    return app
      .httpRequest()
      .get('/hello')
      .set('Host', 'abc.foo.com:7001')
      .expect('hello ctoken')
      .expect(200)
      .expect('Set-Cookie', /ctoken=[\w-]+; path=\/; domain=\.foo\.com/);
  });
});

describe('cookieDomain = string', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/csrf-string-cookiedomain'),
    });
    await app.ready();
  });
  afterAll(() => app.close());

  it('should auto set csrfToken on GET request', () => {
    return app
      .httpRequest()
      .get('/hello')
      .set('Host', 'abc.aaaa.ddd.string.com')
      .expect('hello csrfToken')
      .expect(200)
      .expect('Set-Cookie', /csrfToken=[\w-]+; path=\/; domain=\.string\.com/);
  });
});

describe('cookieOptions = object', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/csrf-cookieOptions'),
    });
    await app.ready();
  });
  afterAll(() => app.close());

  it('should auto set csrfToken with cookie options on GET request', () => {
    return app
      .httpRequest()
      .get('/hello')
      .set('Host', 'abc.aaaa.ddd.string.com')
      .expect('hello csrfToken cookieOptions')
      .expect(200)
      .expect('Set-Cookie', /csrfToken=[\w-]+; path=\/; httponly/);
  });
});

describe('cookieOptions use signed', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/csrf-cookieOptions-signed'),
    });
    await app.ready();
  });
  afterAll(() => app.close());

  it('should auto set csrfToken and csrfToken.sig with cookie options on GET request', () => {
    return app
      .httpRequest()
      .get('/hello')
      .set('Host', 'abc.aaaa.ddd.string.com')
      .expect('hello csrfToken cookieOptions signed')
      .expect(200)
      .expect('Set-Cookie', /csrfToken=[\w-]+; path=\/,csrfToken\.sig=[\w-]+; path=\//);
  });
});
