'use strict';

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
      return app.httpRequest()
        .get('/pathFor')
        .expect('/home')
        .expect(200);
    });

    it('should get home path with params', () => {
      return app.httpRequest()
        .get('/pathFor?foo=bar')
        .expect('/home?foo=bar')
        .expect(200);
    });
  });

  describe('urlFor()', () => {
    it('should get full home url', () => {
      return app.httpRequest()
        .get('/urlFor')
        .expect(/^http:\/\/127\.0\.0\.1:\d+\/home$/)
        .expect(200);
    });

    it('should get full home url with params', () => {
      return app.httpRequest()
        .get('/urlFor?foo=1')
        .expect(/^http:\/\/127\.0\.0\.1:\d+\/home\?foo=1$/)
        .expect(200);
    });
  });

  describe('escape()', () => {
    it('should escape script', () => {
      return app.httpRequest()
        .get('/escape')
        .expect('&lt;script&gt;')
        .expect(200);
    });
  });

  describe('shtml()', () => {
    it('should ignore attribute if domain not in domainWhiteList', () => {
      return app.httpRequest()
        .get('/shtml-not-in-domain-whitelist')
        .expect('true')
        .expect(200);
    });
  });
});
