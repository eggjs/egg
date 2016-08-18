'use strict';

const should = require('should');
const request = require('supertest');
const utils = require('../../../../utils');

describe('test/lib/core/app/middleware/site_file.test.js', () => {
  let app;
  before(() => {
    app = utils.app('apps/middlewares');
    return app.ready();
  });

  after(() => app.close());

  it('should GET /favicon.ico 200', () => {
    return request(app.callback())
      .get('/favicon.ico')
      .expect('Content-Type', 'image/x-icon')
      // .expect(res => console.log(res.headers))
      .expect(200);
  });

  it('should GET /favicon.ico?t=123 200', () => {
    return request(app.callback())
      .get('/favicon.ico?t=123')
      .expect('Content-Type', 'image/x-icon')
      // .expect(res => console.log(res.headers))
      .expect(200);
  });

  it('should 200 when accessing /robots.txt', () => {
    return request(app.callback())
      .get('/robots.txt')
      .expect('User-agent: Baiduspider\nDisallow: /\n\nUser-agent: baiduspider\nDisallow: /')
      .expect(200);
  });

  it('should 200 when accessing crossdomain.xml', () => {
    return request(app.callback())
      .get('/crossdomain.xml')
      .expect('xxx')
      .expect(200);
  });

  it('should support HEAD', () => {
    return request(app.callback())
      .head('/robots.txt')
      .expect('content-length', '72')
      .expect('') // body must be empty for HEAD
      .expect(200);
  });

  it('should ignore POST', () => {
    return request(app.callback())
      .post('/robots.txt')
      .expect(404);
  });

  it('normal router should work', () => {
    return request(app.callback())
      .get('/')
      .expect('home')
      .expect(200);
  });

  it('not defined router should 404', () => {
    return request(app.callback())
      .get('/xxx')
      .expect(404);
  });

  it('should 404 when accessing fake.txt using wrong config', () => {
    return request(app.callback())
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
      return request(app.callback())
        .get('/favicon.ico')
        .expect(302, (err, res) => {
          should.not.exist(err);
          should.not.exist(res.headers['set-cookie']);
          res.headers.location.should.eql('https://eggjs.org/favicon.ico');
        });
    });
  });
});
