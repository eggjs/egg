import { strict as assert } from 'node:assert';
import { mm } from '@eggjs/mock';
import { HttpClient } from 'urllib';
import { HttpClient as ContextHttpClient } from '../../../src/lib/core/httpclient.js';
import { startLocalServer, createApp, MockApplication } from '../../utils.js';

describe('test/lib/core/httpclient.test.ts', () => {
  let client: ContextHttpClient;
  let url: string;

  before(() => {
    client = new ContextHttpClient({
      deprecate: () => {},
      config: {
        httpclient: {
          request: {},
          httpAgent: {},
          httpsAgent: {},
        },
      },
    } as any);
    client.on('request', info => {
      info.args.headers = info.args.headers || {};
      info.args.headers['mock-traceid'] = 'mock-traceid';
      info.args.headers['mock-rpcid'] = 'mock-rpcid';
    });
  });
  before(async () => {
    url = await startLocalServer();
  });

  afterEach(mm.restore);

  it('should request ok with log', done => {
    client.once('response', info => {
      assert.equal(info.req.options.headers['mock-traceid'], 'mock-traceid');
      assert.equal(info.req.options.headers['mock-rpcid'], 'mock-rpcid');
      done();
    });

    client.request(url, {
      dataType: 'text',
    }).then(res => {
      assert.equal(res.status, 200);
    });
  });

  it('should mock ENETUNREACH error', async () => {
    mm(HttpClient.prototype, 'request', async () => {
      const err = new Error('connect ENETUNREACH 1.1.1.1:80 - Local (127.0.0.1)');
      (err as any).code = 'ENETUNREACH';
      throw err;
    });
    await assert.rejects(async () => {
      await client.request(url);
    }, (err: any) => {
      // assert.equal(err.name, 'HttpClientError');
      assert.equal(err.code, 'ENETUNREACH');
      // assert.equal(err.message, 'connect ENETUNREACH 1.1.1.1:80 - Local (127.0.0.1) [ https://eggjs.org/zh-cn/faq/httpclient_ENETUNREACH ]');
      return true;
    });
  });

  it('should handle timeout error', async () => {
    await assert.rejects(async () => {
      await client.request(url + '/timeout', { timeout: 100 });
    }, (err: any) => {
      assert.equal(err.name, 'HttpClientRequestTimeoutError');
      return true;
    });
  });

  it('should request ok with log', async () => {
    let info: any;
    client.once('response', meta => {
      info = meta;
    });
    const { status } = await client.request(url, {
      dataType: 'text',
    });
    assert(status === 200);
    assert(info.req.options.headers['mock-traceid'] === 'mock-traceid');
    assert(info.req.options.headers['mock-rpcid'] === 'mock-rpcid');
    assert(info.req.args.headers['mock-traceid'] === 'mock-traceid');
    assert(info.req.args.headers['mock-rpcid'] === 'mock-rpcid');
  });

  it('should curl ok with log', async () => {
    let info: any;
    client.once('response', meta => {
      info = meta;
    });
    const { status } = await client.curl(url, {
      dataType: 'text',
    });
    assert(status === 200);
    assert(info.req.options.headers['mock-traceid'] === 'mock-traceid');
    assert(info.req.options.headers['mock-rpcid'] === 'mock-rpcid');
    assert(info.req.args.headers['mock-traceid'] === 'mock-traceid');
    assert(info.req.args.headers['mock-rpcid'] === 'mock-rpcid');
  });

  it('should request with error', async () => {
    await assert.rejects(async () => {
      const response = await client.request(url + '/error', {
        dataType: 'json',
      });
      console.log(response);
    }, (err: any) => {
      assert.equal(err.name, 'JSONResponseFormatError');
      assert.match(err.message, /this is an error/);
      assert(err.res);
      assert.equal(err.res.status, 500);
      return true;
    });
  });

  describe.skip('httpclient.httpAgent.timeout < 30000', () => {
    let app: MockApplication;
    before(() => {
      app = createApp('apps/httpclient-agent-timeout-3000');
      return app.ready();
    });
    after(() => app.close());

    it('should auto reset httpAgent.timeout to 30000', () => {
      // should access httpclient first
      assert(app.httpclient);
      assert.equal(app.config.httpclient.timeout, 3000);
      assert.equal(app.config.httpclient.httpAgent.timeout, 30000);
      assert.equal(app.config.httpclient.httpsAgent.timeout, 30000);
    });

    it('should set request default global timeout to 10s', () => {
      // should access httpclient first
      assert(app.httpclient);
      assert.equal(app.config.httpclient.request.timeout, 10000);
    });

    it('should convert compatibility options to agent options', () => {
      // should access httpclient first
      assert(app.httpclient);
      assert(app.config.httpclient.httpAgent.freeSocketTimeout === 2000);
      assert(app.config.httpclient.httpsAgent.freeSocketTimeout === 2000);

      assert(app.config.httpclient.httpAgent.maxSockets === 100);
      assert(app.config.httpclient.httpsAgent.maxSockets === 100);

      assert(app.config.httpclient.httpAgent.maxFreeSockets === 100);
      assert(app.config.httpclient.httpsAgent.maxFreeSockets === 100);

      assert(app.config.httpclient.httpAgent.keepAlive === false);
      assert(app.config.httpclient.httpsAgent.keepAlive === false);
    });
  });

  describe('httpclient.request.timeout = 100', () => {
    let app: MockApplication;
    before(() => {
      app = createApp('apps/httpclient-request-timeout-100');
      return app.ready();
    });
    after(() => app.close());

    it('should set request default global timeout to 100ms', async () => {
      await assert.rejects(async () => {
        await app.httpclient.curl(`${url}/timeout`);
      }, (err: any) => {
        assert(err);
        assert(err.name === 'HttpClientRequestTimeoutError');
        assert(err.message.includes('Request timeout for 100 ms'));
        return true;
      });
    });
  });

  describe('overwrite httpclient', () => {
    let app: MockApplication;
    before(() => {
      app = createApp('apps/httpclient-overwrite');
      return app.ready();
    });
    after(() => app.close());

    it('should set request default global timeout to 100ms', async () => {
      await assert.rejects(async () => {
        await app.httpclient.curl(`${url}/timeout`);
      }, (err: any) => {
        assert(err);
        assert(err.name === 'HttpClientRequestTimeoutError');
        assert(err.message.includes('Request timeout for 100 ms'));
        return true;
      });
    });

    it('should assert url', async () => {
      await assert.rejects(async () => {
        await app.httpclient.curl('unknown url');
      }, (err: any) => {
        assert(err);
        assert(err.message.includes('url should start with http, but got unknown url'));
        return true;
      });
    });
  });

  describe('overwrite httpclient support useHttpClientNext=true', () => {
    let app: MockApplication;
    before(() => {
      app = createApp('apps/httpclient-next-overwrite');
      return app.ready();
    });
    after(() => app.close());

    it('should set request default global timeout to 99ms', async () => {
      await assert.rejects(async () => {
        await app.httpclient.curl(`${url}/timeout`);
      }, (err: any) => {
        assert(err);
        assert(err.name === 'HttpClientRequestTimeoutError');
        assert(err.message.includes('Request timeout for 99 ms'));
        return true;
      });
    });

    it('should assert url', async () => {
      await assert.rejects(async () => {
        await app.httpclient.curl('unknown url');
      }, (err: any) => {
        assert(err);
        assert(err.message.includes('url should start with http, but got unknown url'));
        return true;
      });
    });
  });

  describe('httpclient tracer', () => {
    let app: MockApplication;
    before(() => {
      app = createApp('apps/httpclient-tracer');
      return app.ready();
    });

    after(() => app.close());

    it('should app request auto set tracer', async () => {
      url = await startLocalServer();
      const httpclient = app.httpclient;
      // httpClient alias to httpclient
      assert(app.httpClient);
      assert.equal(app.httpClient, app.httpclient);

      let reqTracer: any;
      let resTracer: any;

      httpclient.on('request', function(options) {
        reqTracer = options.args.tracer;
      });

      httpclient.on('response', function(options) {
        resTracer = options.req.args.tracer;
      });

      let res = await httpclient.request(url, {
        method: 'GET',
      });

      assert(res.status === 200);
      assert(reqTracer === resTracer);

      assert(reqTracer.traceId);
      assert(reqTracer.traceId === resTracer.traceId);

      reqTracer = null;
      resTracer = null;

      res = await httpclient.request(url);

      assert(res.status === 200);
      assert(reqTracer === resTracer);

      assert(reqTracer.traceId);
      assert(reqTracer.traceId === resTracer.traceId);
    });

    it('should agent request auto set tracer', async () => {
      const httpclient = app.agent.httpclient;

      let reqTracer: any;
      let resTracer: any;

      httpclient.on('request', function(options: any) {
        reqTracer = options.args.tracer;
      });

      httpclient.on('response', function(options: any) {
        resTracer = options.req.args.tracer;
      });

      const res = await httpclient.request(url, {
        method: 'GET',
      });

      assert(res.status === 200);
      assert(reqTracer === resTracer);

      assert(reqTracer.traceId);
      assert(reqTracer.traceId === resTracer.traceId);
    });

    it('should app request with ctx and tracer', async () => {
      const httpclient = app.httpclient;

      let reqTracer: any;
      let resTracer: any;

      httpclient.on('request', function(options) {
        reqTracer = options.args.tracer;
      });

      httpclient.on('response', function(options) {
        resTracer = options.req.args.tracer;
      });

      let res = await httpclient.request(url, {
        method: 'GET',
      });

      assert(res.status === 200);

      assert(reqTracer.traceId);
      assert(reqTracer.traceId === resTracer.traceId);

      reqTracer = null;
      resTracer = null;
      res = await httpclient.request(url, {
        method: 'GET',
        ctx: {},
        tracer: {
          id: '1234',
        },
      } as any);

      assert(res.status === 200);
      assert(reqTracer.id === resTracer.id);
      assert(reqTracer.id === '1234');

      reqTracer = null;
      resTracer = null;
      res = await httpclient.request(url, {
        method: 'GET',
        ctx: {
          tracer: {
            id: '5678',
          },
        },
      });

      assert(res.status === 200);
      assert(reqTracer.id === resTracer.id);
      assert(reqTracer.id === '5678');
    });
  });

  describe('httpclient next with tracer', () => {
    let app: MockApplication;
    before(() => {
      app = createApp('apps/httpclient-next-with-tracer');
      return app.ready();
    });

    after(() => app.close());

    it('should app request auto set tracer', async () => {
      url = await startLocalServer();
      const httpclient = app.httpclient;

      let reqTracer: any;
      let resTracer: any;

      httpclient.on('request', function(options) {
        reqTracer = options.args.tracer;
      });

      httpclient.on('response', function(options) {
        resTracer = options.req.args.tracer;
      });

      const opaque = { now: Date.now() };
      let res = await httpclient.request(url, {
        method: 'GET',
        dataType: 'text',
        opaque,
      });
      assert(res.opaque === opaque);

      assert(res.status === 200);
      assert(reqTracer);
      assert(resTracer);
      assert(reqTracer === resTracer);

      assert(reqTracer.traceId);
      assert(reqTracer.traceId === resTracer.traceId);

      reqTracer = null;
      resTracer = null;

      res = await httpclient.request(url);

      assert(res.status === 200);
      assert(reqTracer === resTracer);

      assert(reqTracer.traceId);
      assert(reqTracer.traceId === resTracer.traceId);
    });

    it('should agent request auto set tracer', async () => {
      const httpclient = app.agent.httpclient;

      let reqTracer: any;
      let resTracer: any;

      httpclient.on('request', function(options: any) {
        reqTracer = options.args.tracer;
      });

      httpclient.on('response', function(options: any) {
        resTracer = options.req.args.tracer;
      });

      const res = await httpclient.request(url, {
        method: 'GET',
      });

      assert(res.status === 200);
      assert(reqTracer === resTracer);

      assert(reqTracer.traceId);
      assert(reqTracer.traceId === resTracer.traceId);
    });

    it('should app request with ctx and tracer', async () => {
      const httpclient = app.httpclient;

      let reqTracer: any;
      let resTracer: any;

      httpclient.on('request', function(options) {
        reqTracer = options.args.tracer;
      });

      httpclient.on('response', function(options) {
        resTracer = options.req.args.tracer;
      });

      let res = await httpclient.request(url, {
        method: 'GET',
      });

      assert(res.status === 200);

      assert(reqTracer.traceId);
      assert(reqTracer.traceId === resTracer.traceId);

      reqTracer = null;
      resTracer = null;
      res = await httpclient.request(url, {
        method: 'GET',
        ctx: {},
        tracer: {
          id: '1234',
        },
      } as any);

      assert(res.status === 200);
      assert(reqTracer.id === resTracer.id);
      assert(reqTracer.id === '1234');

      reqTracer = null;
      resTracer = null;
      res = await httpclient.request(url, {
        method: 'GET',
        ctx: {
          tracer: {
            id: '5678',
          },
        },
      });

      assert(res.status === 200);
      assert(reqTracer.id === resTracer.id);
      assert(reqTracer.id === '5678');
    });
  });

  describe('before app ready multi httpclient request tracer', () => {
    let app: MockApplication;
    before(async () => {
      const localServerUrl = await startLocalServer();
      mm(process.env, 'localServerUrl', localServerUrl);
      app = createApp('apps/httpclient-tracer');
      await app.ready();
    });

    after(() => app.close());

    it('should app request before ready use same tracer', async () => {
      const httpclient = app.httpclient;
      const reqTracers: any[] = [];
      const resTracers: any[] = [];

      httpclient.on('request', function(options) {
        reqTracers.push(options.args.tracer);
      });

      httpclient.on('response', function(options) {
        resTracers.push(options.req.args.tracer);
      });

      let res = await httpclient.request(url, {
        method: 'GET',
        timeout: 20000,
      });
      assert(res.status === 200);

      res = await httpclient.request('https://registry.npmmirror.com', {
        method: 'GET',
        timeout: 20000,
      });
      assert(res.status === 200);

      res = await httpclient.request('https://www.npmjs.com', {
        method: 'GET',
        timeout: 20000,
      });
      assert(res.status === 200);

      assert(reqTracers.length === 3);
      assert(resTracers.length === 3);

      assert(reqTracers[0] !== reqTracers[1]);
      assert(reqTracers[1] !== reqTracers[2]);

      assert(resTracers[0] !== reqTracers[2]);
      assert(resTracers[1] !== resTracers[0]);
      assert(resTracers[2] !== resTracers[1]);

      assert(reqTracers[0].traceId);
    });
  });

  describe.skip('compatibility freeSocketKeepAliveTimeout', () => {
    it('should convert freeSocketKeepAliveTimeout to freeSocketTimeout', () => {
      let mockApp: any = {
        config: {
          httpclient: {
            request: {},
            freeSocketKeepAliveTimeout: 1000,
            httpAgent: {},
            httpsAgent: {},
          },
        },
      };
      let client = new HttpClient(mockApp);
      assert(client);
      assert(mockApp.config.httpclient.freeSocketTimeout === 1000);
      assert(!mockApp.config.httpclient.freeSocketKeepAliveTimeout);
      assert(mockApp.config.httpclient.httpAgent.freeSocketTimeout === 1000);
      assert(mockApp.config.httpclient.httpsAgent.freeSocketTimeout === 1000);

      mockApp = {
        config: {
          httpclient: {
            request: {},
            httpAgent: {
              freeSocketKeepAliveTimeout: 1001,
            },
            httpsAgent: {
              freeSocketKeepAliveTimeout: 1002,
            },
          },
        },
      };
      client = new HttpClient(mockApp);
      assert(client);
      assert(mockApp.config.httpclient.httpAgent.freeSocketTimeout === 1001);
      assert(!mockApp.config.httpclient.httpAgent.freeSocketKeepAliveTimeout);
      assert(mockApp.config.httpclient.httpsAgent.freeSocketTimeout === 1002);
      assert(!mockApp.config.httpclient.httpsAgent.freeSocketKeepAliveTimeout);
    });
  });

  describe('httpclient retry', () => {
    let app: MockApplication;
    before(() => {
      app = createApp('apps/httpclient-retry');
      return app.ready();
    });
    after(() => app.close());

    it('should retry when httpclient fail', async () => {
      let hasRetry = false;
      const res = await app.httpclient.curl(`${url}/retry`, {
        retry: 1,
        retryDelay: 100,
        isRetry(res) {
          const shouldRetry = res.status >= 500;
          if (shouldRetry) {
            hasRetry = true;
          }
          return shouldRetry;
        },
      });

      assert(hasRetry);
      assert(res.status === 200);
    });

    it('should retry when httpclient fail', async () => {
      let hasRetry = false;
      const res = await app.httpclient.curl(`${url}/retry`, {
        retry: 1,
        retryDelay: 100,
        isRetry(res) {
          const shouldRetry = res.status >= 500;
          if (shouldRetry) {
            hasRetry = true;
          }
          return shouldRetry;
        },
      });

      assert(hasRetry);
      assert(res.status === 200);
    });
  });

  describe('app.createHttpClient(options)', () => {
    let app: MockApplication;
    before(() => {
      app = createApp('apps/httpclient-retry');
      return app.ready();
    });
    after(() => app.close());

    it('should work', async () => {
      const client1 = app.createHttpClient();
      const client2 = app.createHttpClient();
      assert.notEqual(client1, client2);
      const res = await client1.request(url, {
        method: 'GET',
      });
      assert.equal(res.status, 200);
    });
  });
});
