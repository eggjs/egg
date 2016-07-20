'use strict';

const request = require('supertest-as-promised');
const utils = require('../../utils');

describe('test/lib/plugins/security.test.js', () => {
  describe('security.ctoken = false', () => {
    let app;
    before(() => {
      app = utils.app('apps/ctoken-disable');
      return app.ready();
    });
    after(() => app.close());

    it('should not check ctoken', () => {
      return request(app.callback())
        .get('/api/user.json?name=fengmk2')
        .expect(200)
        .expect({
          url: '/api/user.json?name=fengmk2',
          name: 'fengmk2',
        });
    });
  });

  describe('security.ctoken = true', () => {
    let app;
    before(() => {
      app = utils.app('apps/csrf-disable');
      return app.ready();
    });
    after(() => app.close());

    it('should check ctoken', () => {
      return request(app.callback())
        .get('/api/user.json?name=fengmk2')
        .set('accept', 'application/json')
        .expect(403)
        .expect({
          message: 'missing cookie ctoken',
        });
    });
  });

  describe('security.csrf = false', () => {
    let app;
    before(() => {
      app = utils.app('apps/csrf-disable');
      return app.ready();
    });
    after(() => app.close());

    it('should not check csrf', () => {
      return request(app.callback())
        .post('/api/user')
        .send({ name: 'fengmk2' })
        .expect(200)
        .expect({
          url: '/api/user',
          name: 'fengmk2',
        });
    });
  });

  describe('security.csrf = true', () => {
    let app;
    before(() => {
      app = utils.app('apps/ctoken-disable');
      return app.ready();
    });
    after(() => app.close());

    it('should check csrf', () => {
      return request(app.callback())
        .post('/api/user')
        .send({ name: 'fengmk2' })
        .expect(403)
        .expect('secret is missing');
    });
  });

  describe('security.csrfIgnore and ctokenIgnore', function() {
    let app;
    before(() => {
      app = utils.app('apps/ctoken-ignore');
      return app.ready();
    });
    after(() => app.close());

    it('should not check csrf on /api/*', () => {
      return request(app.callback())
        .post('/api/user')
        .send({ name: 'fengmk2' })
        .expect(200)
        .expect({
          url: '/api/user',
          name: 'fengmk2',
        });
    });

    it('should not check ctoken on /api/*', () => {
      return request(app.callback())
        .post('/api/user.json')
        .send({ name: 'fengmk2' })
        .expect(200)
        .expect({
          url: '/api/user.json',
          name: 'fengmk2',
        });
    });

    it('should check ctoken on other', () => {
      return request(app.callback())
        .post('/apiuser.json')
        .set('accept', 'application/json')
        .send({ name: 'fengmk2' })
        .expect({
          message: 'missing cookie ctoken',
        })
        .expect(403);
    });

    it('should check csrf on other', () => {
      return request(app.callback())
        .post('/apiuser')
        .send({ name: 'fengmk2' })
        .expect('secret is missing')
        .expect(403);
    });
  });
});
