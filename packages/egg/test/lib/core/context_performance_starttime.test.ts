import { strict as assert } from 'node:assert';
import { createApp, MockApplication } from '../../utils.js';

describe('test/lib/core/context_performance_starttime.test.ts', () => {
  let app: MockApplication;

  before(() => {
    app = createApp('apps/app-enablePerformanceTimer-true');
    return app.ready();
  });

  it('should set ctx.performanceStarttime', () => {
    const ctx = app.mockContext();
    assert(ctx.performanceStarttime);
    assert.equal(typeof ctx.performanceStarttime, 'number');
    assert(typeof ctx.performanceStarttime === 'number' && ctx.performanceStarttime > 0);
  });

  it('should use ctx.performanceStarttime on controller', async () => {
    const res = await app.httpRequest()
      .get('/');
    assert.equal(res.status, 200);
    assert.match(res.text, /hello performanceStarttime: \d+\.\d+/);
  });
});
