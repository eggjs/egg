const utils = require("../../utils");
const mm = require("egg-mock");
const dns = require("node:dns");
const dnsPromise = require("node:dns").promises;
const assert = require("node:assert");

describe("test/lib/core/dns_resolver.test.js", () => {
  let app;
  let url1;
  let url2;
  let server1;
  let server2;

  before(async () => {
    server1 = await utils.startNewLocalServer("127.0.0.1");
    server2 = await utils.startNewLocalServer("127.0.0.2");
    if (!server1 || !server2) {
      throw new Error("start local server failed");
    }
    app = utils.app("apps/dns_resolver");
    await app.ready();
    url1 = server1.url;
    url1 = url1.replace("127.0.0.1", "localhost");
    url2 = server2.url;
    url2 = url2.replace("127.0.0.2", "localhost");
  });

  afterEach(mm.restore);

  after(() => {
    if (server1?.server?.listening) server1.server.close();
    if (server2?.server?.listening) server2.server.close();
  });

  it("should bypass dns resolve", async () => {
    const res = await app.curl(server1.url + "/get_headers", { dataType: "json" });
    assert(res.status === 200);
  });

  it("should curl work", async () => {
    const res = await app.curl(url1 + "/get_headers", { dataType: "json" });
    assert(res.status === 200);
  });

  it("should fetch also work", async () => {
    if (!app.fetch) {
      return;
    }
    const res = await app.fetch(url1 + "/get_headers", { dataType: "json" });
    assert(res.status === 200);
  });

  it("should use dns custom lookup and catch error", async () => {
    try {
      if (server1?.server?.listening) await server1.server.close();
      // will resolve to 127.0.0.1
      const res = await app.curl(url1 + "/get_headers", { dataType: "json" });
      assert(res.status !== 200);
    } catch (err) {
      assert(err);
      assert(err.message.includes("ECONNREFUSED"));
    }
  });

  it("should safeCurl also work", async () => {
    const res = await app.safeCurl(url2 + "/get_headers", { dataType: "json" });
    assert(res.status === 200);
  });

  it("should fetch fail", async () => {
    if (!app.fetch) {
      return;
    }
    try {
      if (server1?.server?.listening) await server1.server.close();
      // will resolve to 127.0.0.1
      const res = await app.fetch(url1 + "/get_headers", { dataType: "json" });
      assert(res.status !== 200);
    } catch (err) {
      assert(err);
      assert(err.message.includes("fetch failed"));
    }
  });

  it("should not fail even if dns.lookup fail, because lookup is overridden", async () => {
    mm.error(dnsPromise, "lookup", "mock dns lookup error");
    const res = await app.curl(url2 + "/get_headers", { dataType: "json" });
    assert(res.status === 200);
  });
});

describe("test/lib/core/dns_resolver with dns error", () => {
  let server;
  let app;
  let url;
  let originalDNSServers;

  const cache = new Map();
  before(async () => {
    server = await utils.startNewLocalServer("127.0.0.1");
    if (!server) {
      throw new Error("start local server failed");
    }
    app = utils.app("apps/dns_resolver");
    await app.ready();
    app.config.httpclient.lookup = function (hostname, options, callback) {
      if (cache.has(hostname)) {
        const record = cache.get(hostname);
        if (options && options.all) {
          const addresses = record.map((r) => ({ address: r.address, family: 4 }));
          callback(null, addresses);
          return;
        }
        callback(null, record[0].address, 4);
        return;
      }
      dnsPromise
        .resolve4(hostname, { ttl: true })
        .then((addresses) => {
          if (addresses && addresses.length !== 0) {
            if (Array.isArray(addresses)) {
              cache.set(hostname, addresses);
            } else {
              cache.set(hostname, [addresses]);
            }
            if (options && options.all) {
              const addrList = addresses.map((r) => ({ address: r.address, family: 4 }));
              callback(null, addrList);
              return;
            }
            callback(null, addresses[0].address, 4);
          } else {
            callback(new Error("no addresses found"));
          }
        })
        .catch((err) => {
          callback(err);
        });
    };
    url = server.url;
    url = url.replace("127.0.0.1", "localhost");
    originalDNSServers = dns.getServers();
    dns.setServers(["223.5.5.5", "223.6.6.6"]);
  });

  afterEach(mm.restore);

  after(() => {
    dns.setServers(originalDNSServers);
    if (server?.server?.listening) server.server.close();
  });

  it("should cache work when dns fails", async () => {
    const res1 = await app.curl(url + "/get_headers", { dataType: "json" });
    assert(res1.status === 200);
    assert(cache.has("localhost"));

    mm.error(dnsPromise, "resolve4", "mock dns lookup error");
    const res2 = await app.curl(url + "/get_headers", { dataType: "json" });
    assert(res2.status === 200);
    cache.delete("localhost");
    // should fail now
    // assert.error(app.curl(url + '/get_headers', { dataType: 'json' }))
    let shouldFail = false;
    try {
      await app.curl(url + "/get_headers", { dataType: "json" });
    } catch (err) {
      shouldFail = true;
      assert(err.message.includes("mock dns lookup error"));
    }
    assert(shouldFail);
  });

  it("should cache work when name server fails", async () => {
    const successRes = await app.curl(url + "/get_headers", { dataType: "json" });
    assert(successRes.status === 200);
    assert(cache.has("localhost"));
    // can't resolve localhost now, but cache still works
    dns.setServers(["8.8.8.8"]);
    const res = await app.curl(url + "/get_headers", { dataType: "json" });
    assert(res.status === 200);

    // clear cache, should fail now
    cache.delete("localhost");
    let shouldFail = false;
    try {
      await app.curl(url + "/get_headers", { dataType: "json" });
    } catch (err) {
      shouldFail = true;
      assert(err.message.includes("queryA ENOTFOUND localhost"));
    }
    assert(shouldFail);
  });
});
