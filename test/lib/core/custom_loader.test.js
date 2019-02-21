'use strict';

const assert = require('assert');
const mm = require('egg-mock');
const utils = require('../../utils');
// const fs = require('fs');
// const path = require('path');

describe.only('test/lib/core/custom_loader.test.js', () => {
  afterEach(mm.restore);

  let app;
  before(() => {
    app = utils.app('apps/custom-loader');
    return app.ready();
  });
  after(() => app.close());

  it('should', async () => {
    assert(true);
  });

});
