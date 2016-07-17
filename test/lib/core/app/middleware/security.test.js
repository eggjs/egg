'use strict';

const request = require('supertest-as-promised');
const utils = require('../../../../utils');

describe.skip('test/lib/core/app/middleware/security.test.js', () => {
  describe('security.ctoken = false', function() {
    it('should not check ctoken', function(done) {
      const app = utils.app('apps/ctoken-disable');
      request(app.listen())
      .get('/api/user.json?name=suqian.yf')
      .expect(200)
      .expect({
        url: '/api/user.json?name=suqian.yf',
        name: 'suqian.yf',
      }, done);
    });
  });

  describe('security.ctoken = true', function() {
    it('should check ctoken', function(done) {
      const app = utils.app('apps/csrf-disable');
      request(app.listen())
      .get('/api/user.json?name=suqian.yf')
      .set('accept', 'application/json')
      .expect(403)
      .expect({
        message: 'missing cookie ctoken',
      }, done);
    });
  });

  describe('security.csrf = false', function() {
    it('should not check csrf', function(done) {
      const app = utils.app('apps/csrf-disable');
      request(app.listen())
      .post('/api/user')
      .send({ name: 'suqian.yf' })
      .expect(200)
      .expect({
        url: '/api/user',
        name: 'suqian.yf',
      }, done);
    });
  });

  describe('security.csrf = true', function() {
    it('should check csrf', function(done) {
      const app = utils.app('apps/ctoken-disable');
      request(app.listen())
      .post('/api/user')
      .send({ name: 'suqian.yf' })
      .expect(403)
      .expect('secret is missing', done);
    });
  });

  describe('security.csrfIgnore and ctokenIgnore', function() {
    let app;
    before(function() {
      app = utils.app('apps/ctoken-ignore');
    });

    it('should not check csrf on /api/*', function(done) {
      request(app.listen())
      .post('/api/user')
      .send({ name: 'suqian.yf' })
      .expect(200)
      .expect({
        url: '/api/user',
        name: 'suqian.yf',
      }, done);
    });

    it('should not check ctoken on /api/*', function(done) {
      request(app.listen())
      .post('/api/user.json')
      .send({ name: 'suqian.yf' })
      .expect(200)
      .expect({
        url: '/api/user.json',
        name: 'suqian.yf',
      }, done);
    });

    it('should check ctoken on other', function(done) {
      request(app.listen())
      .post('/apiuser.json')
      .set('accept', 'application/json')
      .send({ name: 'suqian.yf' })
      .expect({
        message: 'missing cookie ctoken',
      })
      .expect(403, done);
    });

    it('should check csrf on other', function(done) {
      request(app.listen())
      .post('/apiuser')
      .send({ name: 'suqian.yf' })
      .expect('secret is missing')
      .expect(403, done);
    });
  });
});
