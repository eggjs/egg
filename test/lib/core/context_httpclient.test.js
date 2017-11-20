'use strict';

const assert = require('assert');
const utils = require('../../utils');

describe('test/lib/core/context_httpclient.test.js', () => {
  let url;
  let app;

  before(() => {
    app = utils.app('apps/context_httpclient');
    return app.ready();
  });
  before(async () => {
    url = await utils.startLocalServer();
  });

  it('should send request with ctx.httpclient', async () => {
    const ctx = app.mockContext();
    const httpclient = ctx.httpclient;
    assert(ctx.httpclient === httpclient);
    assert(httpclient.ctx === ctx);
    assert(typeof httpclient.request === 'function');
    assert(typeof httpclient.curl === 'function');
    const result = await ctx.httpclient.request(url);
    assert(result.status === 200);
    const result2 = await ctx.httpclient.curl(url);
    assert(result2.status === 200);
  });
});
