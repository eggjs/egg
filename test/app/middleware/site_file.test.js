'use strict';

const assert = require('assert');
const utils = require('../../utils');

describe('test/app/middleware/site_file.test.js', () => {
  let app;
  before(() => {
    app = utils.app('apps/middlewares');
    return app.ready();
  });
  after(() => app.close());

  it('should GET /favicon.ico 200', () => {
    return app.httpRequest()
      .get('/favicon.ico')
      .expect(res => assert(res.headers['content-type'].includes('icon')))
      .expect(200);
  });

  it('should GET /favicon.ico?t=123 200', () => {
    return app.httpRequest()
      .get('/favicon.ico?t=123')
      .expect(res => assert(res.headers['content-type'].includes('icon')))
      .expect(200);
  });

  it('should 200 when accessing /robots.txt', () => {
    return app.httpRequest()
      .get('/robots.txt')
      .expect(/^User-agent: Baiduspider\r?\nDisallow: \/\r?\n\r?\nUser-agent: baiduspider\r?\nDisallow: \/$/)
      .expect(200);
  });

  it('should 200 when accessing crossdomain.xml', () => {
    return app.httpRequest()
      .get('/crossdomain.xml')
      .expect('xxx')
      .expect(200);
  });

  it('should support HEAD', () => {
    return app.httpRequest()
      .head('/robots.txt')
      .expect(res => assert(Number(res.header['content-length']) > 0))
      // body must be empty for HEAD
      .expect(res => assert.equal(res.text, undefined))
      .expect(200);
  });

  it('should ignore POST', () => {
    return app.httpRequest()
      .post('/robots.txt')
      .expect(404);
  });

  it('normal router should work', () => {
    return app.httpRequest()
      .get('/')
      .expect('home')
      .expect(200);
  });

  it('not defined router should 404', () => {
    return app.httpRequest()
      .get('/xxx')
      .expect(404);
  });

  it('should 404 when accessing fake.txt using wrong config', () => {
    return app.httpRequest()
      .get('/fake.txt')
      .expect(404);
  });

  describe('custom favicon', () => {
    let app;
    before(() => {
      app = utils.app('apps/favicon');
      return app.ready();
    });
    after(() => app.close());

    it('should redirect https://eggjs.org/favicon.ico', () => {
      return app.httpRequest()
        .get('/favicon.ico')
        .expect(302)
        .expect(res => {
          assert(!res.headers['set-cookie']);
          assert(res.headers.location === 'https://eggjs.org/favicon.ico');
        });
    });
  });

  describe('siteFile.cacheControl = no-store', () => {
    let app;
    before(() => {
      app = utils.app('apps/siteFile-custom-cacheControl');
      return app.ready();
    });
    after(() => app.close());

    it('should get custom cache-control', async () => {
      await app.httpRequest()
        .get('/favicon.ico')
        .expect(res => assert(res.headers['cache-control'].includes('no-store')))
        .expect(200);
    });
  });
});
