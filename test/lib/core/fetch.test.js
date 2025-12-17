const assert = require('node:assert');
const mm = require('egg-mock');
const { detectFetchVersion } = require('../../../lib/core/utils');
const utils = require('../../utils');

describe('test/lib/core/fetch.test.js', () => {
  if (!detectFetchVersion()) {
    console.log('Skip fetch tests on Node.js < 20');
    return;
  }

  let url;
  let app;

  before(() => {
    app = utils.app('apps/fetch');
    return app.ready();
  });

  before(async () => {
    url = await utils.startLocalServer();
  });

  after(() => app.close());

  afterEach(mm.restore);

  describe('basic fetch', () => {
    it('should fetch ok', async () => {
      const response = await app.fetch(url);
      assert(response.status === 200);
      const text = await response.text();
      assert(text);
    });

    it('should support POST request with body', async () => {
      const response = await app.fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'test' }),
      });
      assert(response.status === 200);
    });
  });

  describe('safeFetch with SSRF protection', () => {
    it('should call checkAddress when using safeFetch', async () => {
      let checkAddressCalled = false;
      let checkedIp;
      let checkedFamily;
      let checkedHost;

      mm(app.config.security.ssrf, 'checkAddress', (ip, family, host) => {
        checkAddressCalled = true;
        checkedIp = ip;
        checkedFamily = family;
        checkedHost = host;
        return true;
      });

      const response = await app.safeFetch(url);
      assert(response.status === 200);
      assert(checkAddressCalled, 'checkAddress should be called');
      assert(checkedIp, 'IP should be checked');
      assert(checkedFamily, 'Family should be checked');
      assert(checkedHost, 'Host should be checked');
    });

    it('should block request when checkAddress returns false', async () => {
      mm(app.config.security.ssrf, 'checkAddress', () => {
        return false;
      });

      await assert.rejects(
        async () => {
          await app.safeFetch(url);
        },
        err => {
          assert(err);
          return true;
        }
      );
    });

    it('should warn when ssrf config is not set', async () => {
      const logs = [];
      mm(app.logger, 'warn', msg => {
        logs.push(msg);
      });

      mm(app.config.security, 'ssrf', undefined);

      // safeFetch should still work but log a warning
      const response = await app.safeFetch(url);
      assert(response.status === 200);

      const hasWarning = logs.some(log =>
        log.includes('please configure `config.security.ssrf` first')
      );
      assert(hasWarning, 'Should log warning about missing ssrf config');
    });
  });

  describe('context fetch', () => {
    it('should have fetchClient on context', () => {
      const ctx = app.mockContext();
      const fetchClient = ctx.fetchClient;
      assert(fetchClient);
      assert(ctx.fetchClient === fetchClient);
      assert(fetchClient.ctx === ctx);
      assert(typeof fetchClient.fetch === 'function');
      assert(typeof fetchClient.safeFetch === 'function');
    });

    it('should send request with ctx.fetch', async () => {
      const ctx = app.mockContext();
      const response = await ctx.fetch(url);
      assert(response);
      assert(response.status === 200);
      const text = await response.text();
      assert(text);
    });

    it('should send request with ctx.fetchClient.fetch', async () => {
      const ctx = app.mockContext();
      const response = await ctx.fetchClient.fetch(url);
      assert(response);
      assert(response.status === 200);
      const text = await response.text();
      assert(text);
    });

    it('should send request with ctx.safeFetch', async () => {
      const ctx = app.mockContext();
      const response = await ctx.safeFetch(url);
      assert(response);
      assert(response.status === 200);
      const text = await response.text();
      assert(text);
    });

    it('should send request with ctx.fetchClient.safeFetch', async () => {
      const ctx = app.mockContext();
      const response = await ctx.fetchClient.safeFetch(url);
      assert(response);
      assert(response.status === 200);
      const text = await response.text();
      assert(text);
    });
  });

  describe('fetch with custom options', () => {
    it('should support timeout', async () => {
      await assert.rejects(
        async () => {
          await app.fetch(url + '/timeout', {
            signal: AbortSignal.timeout(100),
          });
        },
        err => {
          assert(err);
          return true;
        }
      );
    });

    it('should support custom headers', async () => {
      const response = await app.fetch(url, {
        headers: {
          'X-Custom-Header': 'test-value',
          'User-Agent': 'egg-test',
        },
      });
      assert(response.status === 200);
    });
  });

  describe('fetch integration', () => {
    it('should work alongside httpclient', async () => {
      // Both httpclient and fetch should work together
      const fetchResponse = await app.fetch(url);
      assert(fetchResponse.status === 200);

      const httpclientResponse = await app.httpclient.request(url);
      assert(httpclientResponse.status === 200);
    });
  });

  describe('agent fetch', () => {
    it('should agent have fetch', () => {
      assert(app.agent);
      assert(app.agent.fetch);
      assert(typeof app.agent.fetch === 'function');
      assert(app.agent.safeFetch);
      assert(typeof app.agent.safeFetch === 'function');
    });

    it('should agent fetch work', async () => {
      const response = await app.agent.fetch(url);
      assert(response.status === 200);
      const text = await response.text();
      assert(text);
    });

    it('should agent safeFetch work', async () => {
      const response = await app.agent.safeFetch(url);
      assert(response.status === 200);
      const text = await response.text();
      assert(text);
    });

    it('should agent fetch with custom headers', async () => {
      const response = await app.agent.fetch(url, {
        headers: {
          'X-Agent-Header': 'agent-test',
        },
      });
      assert(response.status === 200);
    });

    it('should agent fetch support POST request', async () => {
      const response = await app.agent.fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'agent-test' }),
      });
      assert(response.status === 200);
    });
  });
});
