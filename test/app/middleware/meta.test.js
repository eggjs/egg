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
});
