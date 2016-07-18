'use strict';

const request = require('supertest-as-promised');
const utils = require('../../../../utils');

describe('test/lib/core/app/middleware/override_method.test.js', () => {
  let app;
  before(() => {
    app = utils.app('apps/override_method');
    return app.ready();
  });
  after(() => app.close());

  it('should put', () => {
    return request(app.callback())
      .post('/test')
      .send({ _method: 'PUT' })
      .expect(200)
      .expect('test-put');
  });

  it('should patch', () => {
    return request(app.callback())
      .post('/test')
      .send({ _method: 'PATCH' })
      .expect(200)
      .expect('test-patch');
  });

  it('should delete', () => {
    return request(app.callback())
      .post('/test')
      .send({ _method: 'DELETE' })
      .expect(200)
      .expect('test-delete');
  });
});
