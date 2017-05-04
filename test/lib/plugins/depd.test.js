'use strict';

const assert = require('assert');

const mm = require('egg-mock');
const utils = require('../../utils');

describe('test/lib/plugins/depd.test.js', () => {
  afterEach(mm.restore);

  let app;
  before(() => {
    app = utils.app('apps/demo');
    return app.ready();
  });
  after(() => app.close());

  it('should use this.locals instead of this.state', () => {
    const ctx = app.mockContext();
    ctx.locals.test = 'aaa';
    assert.deepEqual(ctx.locals, ctx.state);
    assert.deepEqual(ctx.locals.test, ctx.state.test);
  });
});
