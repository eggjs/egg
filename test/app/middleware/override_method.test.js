'use strict';

const utils = require('../../utils');

describe('test/app/middleware/override_method.test.js', () => {
  let app;
  before(() => {
    app = utils.app('apps/override_method');
    return app.ready();
  });
  after(() => app.close());

  it('should put', () => {
    app.mockCsrf();
    return app.httpRequest()
      .post('/test')
      .send({ _method: 'PUT' })
      .expect(200)
      .expect('test-put');
  });

  it('should patch', () => {
    app.mockCsrf();
    return app.httpRequest()
      .post('/test')
      .send({ _method: 'PATCH' })
      .expect(200)
      .expect('test-patch');
  });

  it('should delete', () => {
    return app.httpRequest()
      .post('/test')
      .send({ _method: 'DELETE' })
      .expect(200)
      .expect('test-delete');
  });

  it('should not work on PUT request', () => {
    app.mockCsrf();
    return app.httpRequest()
      .put('/test')
      .send({ _method: 'DELETE' })
      .expect(200)
      .expect('test-put');
  });

  it('should not work on GET request', () => {
    return app.httpRequest()
      .get('/test')
      .set('x-http-method-override', 'DELETE')
      .expect(200)
      .expect('test-get');
  });
});
