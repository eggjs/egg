const utils = require('../../utils');
const Koa = require('koa');
const http = require('http');
const assert = require('assert');

const startServer = (ip = '127.0.0.1') => {
  let localServer;
  return new Promise((resolve, reject) => {
    const app = new Koa();
    app.use(async ctx => {
      if (ctx.path === '/get_headers') {
        ctx.body = {
          headers: ctx.request.headers,
          host: ctx.request.headers.host,
        };
        return;
      }
      ctx.body = `${ctx.method} ${ctx.path}`;
    });
    localServer = http.createServer(app.callback());

    localServer.listen(0, err => {
      if (err) return reject(err);
      return resolve({ url: `http://${ip}:` + localServer.address().port, server: localServer });
    });
  });
};

describe('test/lib/core/dns_resolver.test.js', () => {
  let app;
  let url1;
  let url2;
  let server1;
  let server2;

  process.once('exit', () => {
    if (server1?.server?.close) server1.server.close();
    if (server2?.server?.close) server2.server.close();
  });

  before(async () => {
    server1 = await startServer('127.0.0.1');
    server2 = await startServer('127.0.0.2');
    if (!server1 || !server2) {
      throw new Error('start local server failed');
    }
    app = utils.app('apps/dns_resolver');
    await app.ready();
    url1 = server1.url;
    url1 = url1.replace('127.0.0.1', 'localhost');
    url2 = server2.url;
    url2 = url2.replace('127.0.0.2', 'localhost');
  });

  after(() => {
    if (server1?.server?.close) server1.server.close();
    if (server2?.server?.close) server2.server.close();
  });

  it('should surpass dns resolve', async () => {
    const res = await app.curl(server1.url + '/get_headers', { dataType: 'json' });
    assert(res.status === 200);
  });

  it('should curl work', async () => {
    const res = await app.curl(url1 + '/get_headers', { dataType: 'json' });
    assert(res.status === 200);
  });

  it('should fetch also work', async () => {
    const res = await app.fetch(url1 + '/get_headers', { dataType: 'json' });
    assert(res.status === 200);
  });

  it('should use dns custom lookup and catch error', async () => {
    try {
      if (server1?.server) await server1.server.close();
      // will resolve to 127.0.0.1
      const res = await app.curl(url1 + '/get_headers', { dataType: 'json' });
      assert(res.status !== 200);
    } catch (err) {
      assert(err);
      assert(err.message.includes('ECONNREFUSED'));
    }
  });

  it('should safeCurl also work', async () => {
    const res = await app.curl(url2 + '/get_headers', { dataType: 'json' });
    assert(res.status === 200);
  });

  it('should safeFetch also work', async () => {
    const res = await app.safeFetch(url2 + '/get_headers', { dataType: 'json' });
    assert(res.status === 200);
  });

  it('should fetch fail', async () => {
    try {
      if (server1?.server) await server1.server.close();
      // will resolve to 127.0.0.1
      const res = await app.fetch(url1 + '/get_headers', { dataType: 'json' });
      assert(res.status !== 200);
    } catch (err) {
      assert(err);
      assert(err.message.includes('fetch failed'));
    }
  });
});
