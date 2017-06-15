'use strict';

const assert = require('assert');
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
    assert(app.config.name === 'demo');
    assert(app.config.logger.disableConsoleAfterReady === false);
  });
});
