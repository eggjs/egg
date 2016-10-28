'use strict';

const request = require('supertest');
const utils = require('../../utils');

describe('test/app/extend/helper.test.js', () => {
  let app;
  before(() => {
    app = utils.app('apps/helper');
    return app.ready();
  });
  after(() => app.close());

  describe('pathFor()', () => {
    it('should get home path url', () => {
      return request(app.callback())
        .get('/pathFor')
        .expect('/home')
        .expect(200);
    });

    it('should get home path with params', () => {
      return request(app.callback())
        .get('/pathFor?foo=bar')
        .expect('/home?foo=bar')
        .expect(200);
    });
  });

  describe('urlFor()', () => {
    it('should get full home url', () => {
      return request(app.callback())
        .get('/urlFor')
        .expect(/^http:\/\/127\.0\.0\.1:\d+\/home$/)
        .expect(200);
    });

    it('should get full home url with params', () => {
      return request(app.callback())
        .get('/urlFor?foo=1')
        .expect(/^http:\/\/127\.0\.0\.1:\d+\/home\?foo=1$/)
        .expect(200);
    });

  });

  describe.skip('escape()', () => {
    it('should escape script', () => {
      return request(app.callback())
        .get('/escape')
        .expect('&lt;script&gt;')
        .expect(200);
    });
  });

  describe.skip('shtml()', () => {
    it('should ignore attribute if domain not in domainWhiteList', () => {
      return request(app.callback())
        .get('/shtml-not-in-domain-whitelist')
        .expect('true')
        .expect(200);
    });

    it('should keep attribute if domain in default domainWhiteList', () => {
      return request(app.callback())
        .get('/shtml-in-default-domain-whitelist')
        .expect('true')
        .expect(200);
    });
  });
});
