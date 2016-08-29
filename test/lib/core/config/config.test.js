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

  it('should return config.name', () => {
    app.config.name.should.equal('demo');
  });
});
