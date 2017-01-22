'use strict';

const request = require('supertest');
const utils = require('../../utils');

describe('test/lib/plugins/security.test.js', () => {
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
      app = utils.app('apps/csrf-enable');
      return app.ready();
    });
    after(() => app.close());

    it('should check csrf', () => {
      return request(app.callback())
        .post('/api/user')
        .send({ name: 'fengmk2' })
        .expect(403)
        .expect(/missing csrf token/);
    });
  });

  describe('security.csrfIgnore', () => {
    let app;
    before(() => {
      app = utils.app('apps/csrf-ignore');
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

    it('should not check csrf on /api/*.json', () => {
      return request(app.callback())
        .post('/api/user.json')
        .send({ name: 'fengmk2' })
        .expect(200)
        .expect({
          url: '/api/user.json',
          name: 'fengmk2',
        });
    });

    it('should check csrf on other.json', () => {
      return request(app.callback())
        .post('/apiuser.json')
        .set('accept', 'application/json')
        .send({ name: 'fengmk2' })
        .expect({
          message: 'missing csrf token',
        })
        .expect(403);
    });

    it('should check csrf on other', () => {
      return request(app.callback())
        .post('/apiuser')
        .send({ name: 'fengmk2' })
        .expect(/missing csrf token/)
        .expect(403);
    });
  });
});
