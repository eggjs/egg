'use strict';

const mm = require('egg-mock');
const utils = require('../../utils');

describe('test/app/middleware/meta.test.js', () => {
  let app;
  before(() => {
    app = utils.app('apps/middlewares');
    return app.ready();
  });

  after(() => app.close());

  afterEach(mm.restore);

  it('should get X-Readtime header', () => {
    return app.httpRequest()
      .get('/')
      .expect('X-Readtime', /\d+/)
      .expect(200);
  });

  describe('cluster start', () => {
    let app;
    before(() => {
      app = utils.cluster('apps/middlewares');
      return app.ready();
    });
    after(() => app.close());

    it('should ignore keep-alive header when request is not keep-alive', () => {
      return app.httpRequest()
        .get('/')
        .expect('X-Readtime', /\d+/)
        .expect(res => assert(!res.headers['keep-alive']))
        .expect(200);
    });

    it('should return keep-alive header when request is keep-alive', () => {
      return app.httpRequest()
        .get('/')
        .set('connection', 'keep-alive')
        .expect('X-Readtime', /\d+/)
        .expect('keep-alive', 'timeout=5')
        .expect(200);
    });
  });
});
