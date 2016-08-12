'use strict';

const utils = require('../../../utils');

describe('test/lib/core/loader/config_loader.test.js', () => {
  let app;
  before(() => {
    app = utils.app('apps/demo');
    return app.ready();
  });
  after(() => app.close());

  it('should get middlewares', () => {
    app.config.coreMiddleware.slice(0, 5).should.eql([
      'meta',
      'siteFile',
      'notfound',
      'bodyParser',
      'overrideMethod',
    ]);
  });
});
