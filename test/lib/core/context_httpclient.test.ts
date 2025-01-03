import { strict as assert } from 'node:assert';
import { createApp, startLocalServer, MockApplication } from '../../utils.js';

describe('test/lib/core/context_httpclient.test.ts', () => {
  let url: string;
  let app: MockApplication;

  before(() => {
    app = createApp('apps/context_httpclient');
    return app.ready();
  });
  before(async () => {
    url = await startLocalServer();
  });

  it('should send request with ctx.httpclient', async () => {
    const ctx = app.mockContext();
    const httpclient = ctx.httpclient;
    assert(ctx.httpclient === httpclient);
    assert((httpclient as any).ctx === ctx);
    assert(typeof httpclient.request === 'function');
    assert(typeof httpclient.curl === 'function');
    const result = await ctx.httpclient.request(url);
    assert(result.status === 200);
    const result2 = await ctx.httpclient.curl(url);
    assert(result2.status === 200);
  });
});
