'use strict';

const mock = require('egg-mock');
const utils = require('../../utils');

describe('test/lib/core/custom_loader.test.js', () => {
  afterEach(mock.restore);

  let app;
  before(() => {
    app = utils.app('apps/custom-loader');
    return app.ready();
  });
  after(() => app.close());

  it('should', async () => {
    await app.httpRequest()
      .get('/users/popomore')
      .expect({
        adapter: 'docker',
        repository: 'popomore',
      })
      .expect(200);
  });

});
