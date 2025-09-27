import { mm, MockApplication } from '@eggjs/mock';

describe('test/csrf_cookieDomain.test.ts', () => {
  afterEach(mm.restore);

  describe('cookieDomain = function', () => {
    let app: MockApplication;
    before(() => {
      app = mm.app({
        baseDir: 'apps/ctoken',
      });
      return app.ready();
    });
    after(() => app.close());

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
    before(() => {
      app = mm.app({
        baseDir: 'apps/csrf-string-cookiedomain',
      });
      return app.ready();
    });
    after(() => app.close());

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
    before(() => {
      app = mm.app({
        baseDir: 'apps/csrf-cookieOptions',
      });
      return app.ready();
    });
    after(() => app.close());

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
    before(() => {
      app = mm.app({
        baseDir: 'apps/csrf-cookieOptions-signed',
      });
      return app.ready();
    });
    after(() => app.close());

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
});
