const assert = require('node:assert');
const http = require('http');
const utils = require('../../utils');

describe('test/lib/core/fetch_tracer.test.js', () => {
  const version = utils.getNodeVersion();
  if (version < 20) return;

  let app;
  let mockServer;

  before(async () => {
    // Create a mock server to capture headers
    mockServer = http.createServer((req, res) => {
      const headers = {
        'Content-Type': 'application/json',
      };
      if (req.headers['x-trace-id']) {
        headers['x-trace-id'] = req.headers['x-trace-id'];
      }
      if (req.headers['x-rpc-id']) {
        headers['x-rpc-id'] = req.headers['x-rpc-id'];
      }

      res.writeHead(200, headers);
      res.end(JSON.stringify({ ok: true }));
    });

    await new Promise(resolve => {
      mockServer.listen(0, '127.0.0.1', resolve);
    });

    app = utils.app('apps/fetch-tracer');
    await app.ready();
  });

  after(() => {
    if (mockServer?.listening) {
      mockServer.close();
    }
  });

  it('should add tracer headers when fetch is called', async () => {
    const port = mockServer.address().port;
    const targetUrl = `http://127.0.0.1:${port}/mock`;

    const response = await app.httpRequest()
      .get('/test')
      .query({ url: targetUrl })
      .expect(200);

    assert.strictEqual(response.body.status, 200);
    assert.strictEqual(response.body.ok, true);

    // Verify tracer headers were added with incremented rpcId
    assert.strictEqual(response.headers['x-trace-id'], 'test-trace-id-123');
    assert.strictEqual(response.headers['x-rpc-id'], '0.1'); // rpcIdPlus increments from 0
  });

  it('should work when tracer is not set', async () => {
    // Clear currentContext
    app.currentContext = null;

    const port = mockServer.address().port;
    const targetUrl = `http://127.0.0.1:${port}/mock`;

    const response = await app.fetch(targetUrl);

    assert.strictEqual(response.status, 200);

    // Verify no tracer headers when tracer is not set
    assert.strictEqual(response.headers.get('x-trace-id'), null);
    assert.strictEqual(response.headers.get('x-rpc-id'), null);
  });


  it('should handle fetch before configDidLoad completes', async () => {
    // Test that lazy initialization preserves interceptors set in configDidLoad
    const port = mockServer.address().port;
    const targetUrl = `http://127.0.0.1:${port}/mock`;

    const ctx = app.mockContext();
    ctx.tracer = new app.Tracer('early-trace-id', '0.1');
    app.currentContext = ctx;

    const response = await app.fetch(targetUrl);
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.headers.get('x-trace-id'), 'early-trace-id');
    assert.strictEqual(response.headers.get('x-rpc-id'), '0.1.1'); // rpcIdPlus increments from 0.1
  });

  it('should increment rpcId on multiple fetch calls', async () => {
    // Test that rpcId increments properly on each fetch
    const port = mockServer.address().port;
    const targetUrl = `http://127.0.0.1:${port}/mock`;

    const ctx = app.mockContext();
    ctx.tracer = new app.Tracer('multi-trace-id', '0');
    app.currentContext = ctx;

    // First fetch
    let response = await app.fetch(targetUrl);
    assert.strictEqual(response.headers.get('x-trace-id'), 'multi-trace-id');
    assert.strictEqual(response.headers.get('x-rpc-id'), '0.1');

    // Second fetch
    response = await app.fetch(targetUrl);
    assert.strictEqual(response.headers.get('x-trace-id'), 'multi-trace-id');
    assert.strictEqual(response.headers.get('x-rpc-id'), '0.2');

    // Third fetch
    response = await app.fetch(targetUrl);
    assert.strictEqual(response.headers.get('x-trace-id'), 'multi-trace-id');
    assert.strictEqual(response.headers.get('x-rpc-id'), '0.3');
  });
});
