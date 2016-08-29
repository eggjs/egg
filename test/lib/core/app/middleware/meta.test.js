'use strict';

const mm = require('egg-mock');
const request = require('supertest');
const utils = require('../../../../utils');

describe('test/lib/core/app/middleware/meta.test.js', () => {
  let app;
  before(() => {
    app = utils.app('apps/middlewares');
    return app.ready();
  });

  after(() => app.close());

  afterEach(mm.restore);

  it('should get X-Readtime header', () => {
    return request(app.callback())
      .get('/')
      .expect('X-Readtime', /\d+/)
      .expect(200);
  });
});
