'use strict';

const assert = require('assert');
const utils = require('../../utils');

describe('test/lib/core/context_performance_starttime.test.js', () => {
  let app;

  before(() => {
    app = utils.app('apps/app-enablePerformanceTimer-true');
    return app.ready();
  });

  it('should set ctx.performanceStarttime', () => {
    const ctx = app.mockContext();
    assert(ctx.performanceStarttime);
    assert(ctx.performanceStarttime > 0);
    assert(typeof ctx.performanceStarttime === 'number');
  });

  it('should use ctx.performanceStarttime on controller', async () => {
    const res = await app.httpRequest()
      .get('/');
    assert(res.status === 200);
    assert(/hello performanceStarttime: \d+\.\d+/.test(res.text));
  });
});
