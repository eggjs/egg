'use strict';

const mm = require('egg-mock');
const utils = require('../../../utils');

describe('test/lib/core/config/config.test.js', () => {
  let app;
  before(() => {
    app = utils.app('apps/demo');
    return app.ready();
  });
  after(() => app.close());

  afterEach(mm.restore);

  it('should return config.core.name that is deprecated', () => {
    app.config.core.name.should.equal('Egg');
  });
});
