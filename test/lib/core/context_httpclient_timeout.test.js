const assert = require('assert');
const utils = require('../../utils');

describe('test/lib/core/context_httpclient_timeout.test.js', () => {
  let url;
  let app;

  before(() => {
    app = utils.app('apps/context_httpclient_timeout');
    return app.ready();
  });
  before(async () => {
    url = await utils.startLocalServer();
  });

  it('should request timeout override agent socket timeout', async () => {
    app.httpclient.agent.options.timeout = 1000;
    const ctx = app.mockContext();
    await assert.rejects(async () => {
      await ctx.httpclient.request(`${url}/timeout`, { timeout: 1500 });
    }, /ResponseTimeoutError: Response timeout for 1500ms/);
  });
});
