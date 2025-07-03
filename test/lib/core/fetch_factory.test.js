const assert = require('node:assert');
const mm = require('egg-mock');
const { FetchFactory, safeFetch } = require('../../../lib/core/fetch_factory');
const utils = require('../../utils');

describe('test/lib/core/fetch_factory.test.js', () => {
  if (!FetchFactory) return;
  let url;

  before(async () => {
    url = await utils.startLocalServer();
  });

  afterEach(mm.restore);

  it('should fetch ok', async () => {
    const { status } = await FetchFactory.fetch(url);
    assert(status === 200);
  });

  it('should support safeFetch', async () => {
    let ip;
    let family;
    let host;
    const fetch = safeFetch.bind({
      config: {
        security: {
          ssrf: {
            checkAddress(aIp, aFamily, aHost) {
              ip = aIp;
              family = aFamily;
              host = aHost;
              return true;
            },
          },
        },
      },
      logger: console,
    });
    await fetch(url);
    assert(ip);
    assert(family);
    assert(host);
  });
});
