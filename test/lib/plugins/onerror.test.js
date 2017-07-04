'use strict';

const mm = require('egg-mock');
const utils = require('../../utils');

describe('test/lib/plugins/onerror.test.js', () => {
  let app;
  before(() => {
    mm.env('local');
    mm(process.env, 'EGG_LOG', 'none');
    app = utils.app('apps/onerror');
    return app.ready();
  });

  after(() => app.close());

  afterEach(mm.restore);

  it('should redirect to error page', () => {
    mm(app.config, 'env', 'test');
    return app.httpRequest()
      .get('/?status=500')
      .expect('Location', 'http://eggjs.org/500?real_status=500')
      .expect(302);
  });
});
