const assert = require('node:assert');
const utils = require('../../utils');

let ip;
let family;
let host;

describe('test/lib/core/fetch_factory.test.js', () => {
  const version = utils.getNodeVersion();
  if (version < 20) return;
  let app;
  let server1;
  let server2;

  before(async () => {
    app = utils.app('apps/dns_resolver');
    await app.ready();
    app.config.security = {
      ssrf: {
        checkAddress(aIp, aFamily, aHost) {
          ip = aIp;
          family = aFamily;
          host = aHost;
          return true;
        },
      },
    };

    server1 = await utils.startNewLocalServer('127.0.0.1');
    server2 = await utils.startNewLocalServer('127.0.0.1');
  });

  after(() => {
    if (server1?.server?.listening) {
      server1.server.close();
    }
    if (server2?.server?.listening) {
      server2.server.close();
    }
  });

  it('should fetch ok', async () => {
    const { status } = await app.fetch(server1.url);
    assert(status === 200);
  });

  it('should support safeFetch', async () => {
    await app.safeFetch(server1.url);
    assert(ip, 'checkAddress should be called');
    assert(family);
    assert(host);

  });

  it('should support safeFetch for second time', async () => {
    await app.safeFetch(server2.url);
    assert(ip, 'checkAddress should be called');
    assert(family);
    assert(host);
  });
});
