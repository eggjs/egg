'use strict';

const should = require('should');
const mm = require('egg-mock');
const request = require('supertest');
const utils = require('../../../../utils');

describe('test/lib/core/app/middleware/meta.test.js', () => {
  let app;
  before(() => {
    mm(process.env, 'HOSTNAME', 'appname-1-1');
    app = utils.app('apps/middlewares');
    return app.ready();
  });

  after(() => app.close());

  afterEach(mm.restore);

  it('should get X-Powered-By header', () => {
    return request(app.callback())
      .get('/')
      .expect('X-Powered-By', 'Egg')
      .expect(200);
  });

  it('should still get X-Powered-By header when controller error', () => {
    return request(app.callback())
      .get('/error')
      .expect('X-Powered-By', 'Egg')
      .expect(500);
  });

  it('should hide X-Powered-By header', () => {
    mm(app, 'poweredBy', false);
    return request(app.callback())
      .get('/')
      .expect(res => {
        should.not.exist(res.headers['X-Powered-By']);
      })
      .expect(200);
  });

  it('should get X-Server-Id header', () => {
    return request(app.callback())
      .get('/')
      .expect('X-Server-Id', '1-1')
      .expect(200);
  });

  it('should hide X-Server-Id header', done => {
    mm(process.env, 'HOSTNAME', '');
    const app = utils.app('apps/middlewares');
    request(app.callback())
    .get('/')
    .expect(res => {
      should.not.exist(res.headers['X-Server-Id']);
    })
    .expect(200, err => {
      app.close();
      should.not.exist(err);
      done();
    });
  });

  it('should get X-Readtime header', () => {
    return request(app.callback())
      .get('/')
      .expect('X-Readtime', /\d+/)
      .expect(200);
  });
});
