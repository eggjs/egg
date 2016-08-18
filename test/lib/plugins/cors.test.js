'use strict';

const request = require('supertest');
const mm = require('egg-mock');
const utils = require('../../utils');

describe.skip('test/lib/plugins/cors.test.js', () => {
  let app;
  before(() => {
    app = utils.app('apps/cors');
    return app.ready();
  });
  after(() => app.close());

  afterEach(mm.restore);

  it('should set `Access-Control-Allow-Origin` to request origin header', () => {
    return request(app.callback())
      .get('/')
      .set('Origin', 'http://eggjs.org/foo')
      .expect('Access-Control-Allow-Origin', 'http://eggjs.org/foo')
      .expect('Access-Control-Allow-Credentials', 'true')
      .expect({ foo: 'bar' })
      .expect(200);
  });

  it('should set `Access-Control-Allow-Origin` on POST request', () => {
    app.mockCsrf && app.mockCsrf();
    return request(app.callback())
      .post('/')
      .set('Origin', 'http://eggjs.org')
      .expect('Access-Control-Allow-Origin', 'http://eggjs.org')
      .expect('Access-Control-Allow-Credentials', 'true')
      .expect(200);
  });
});
