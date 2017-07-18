'use strict';

const assert = require('assert');
const mm = require('egg-mock');
const createHttpclient = require('../../../lib/core/httpclient');
const utils = require('../../utils');

describe('test/lib/core/httpclient.test.js', () => {
  let client;
  let url;

  before(() => {
    client = createHttpclient({
      config: {
        httpclient: {
          request: {},
          httpAgent: {},
          httpsAgent: {},
        },
      },
    });
    client.on('request', info => {
      info.args.headers = info.args.headers || {};
      info.args.headers['mock-traceid'] = 'mock-traceid';
      info.args.headers['mock-rpcid'] = 'mock-rpcid';
    });
  });
  before(function* () {
    url = yield utils.startLocalServer();
  });

  afterEach(mm.restore);

  it('should request ok with log', done => {
    const args = {
      dataType: 'text',
    };
    client.once('response', info => {
      assert(info.req.options.headers['mock-traceid'] === 'mock-traceid');
      assert(info.req.options.headers['mock-rpcid'] === 'mock-rpcid');
      done();
    });

    client.request(url, args);
  });

  it('should request callback with log', done => {
    client.once('response', info => {
      assert(info.req.options.headers['mock-traceid'] === 'mock-traceid');
      assert(info.req.options.headers['mock-rpcid'] === 'mock-rpcid');
      done();
    });

    client.request(url, () => {});
  });

  it('should curl ok with log', done => {
    const args = {
      dataType: 'text',
    };
    client.once('response', info => {
      assert(info.req.options.headers['mock-traceid'] === 'mock-traceid');
      assert(info.req.options.headers['mock-rpcid'] === 'mock-rpcid');
      done();
    });

    client.curl(url, args);
  });

  it('should requestThunk ok with log', function* () {
    const args = {
      dataType: 'text',
    };
    client.once('response', info => {
      assert(info.req.options.headers['mock-traceid'] === 'mock-traceid');
      assert(info.req.options.headers['mock-rpcid'] === 'mock-rpcid');
    });

    yield client.requestThunk(url, args);
  });

  it('should request error with log', done => {
    mm.http.requestError(/.*/i, null, 'mock res error');

    client.once('response', info => {
      assert(info.req.options.headers['mock-traceid'] === 'mock-traceid');
      assert(info.req.options.headers['mock-rpcid'] === 'mock-rpcid');
      assert(info.error.message.includes('mock res error'));
      done();
    });

    client.request(url).catch(() => {
      // it will print
      // console.error(e.stack);
    });
  });

  describe('httpclient.httpAgent.timeout < 30000', () => {
    let app;
    before(() => {
      app = utils.app('apps/httpclient-agent-timeout-3000');
      return app.ready();
    });
    after(() => app.close());

    it('should auto reset httpAgent.timeout to 30000', () => {
      // should access httpclient first
      assert(app.httpclient);
      assert(app.config.httpclient.timeout === 3000);
      assert(app.config.httpclient.httpAgent.timeout === 30000);
      assert(app.config.httpclient.httpsAgent.timeout === 30000);
    });

    it('should set request default global timeout to 10s', () => {
      // should access httpclient first
      assert(app.httpclient);
      assert(app.config.httpclient.request.timeout === 10000);
    });

    it('should convert compatibility options to agent options', () => {
      // should access httpclient first
      assert(app.httpclient);
      assert(app.config.httpclient.httpAgent.freeSocketKeepAliveTimeout === 2000);
      assert(app.config.httpclient.httpsAgent.freeSocketKeepAliveTimeout === 2000);

      assert(app.config.httpclient.httpAgent.maxSockets === 100);
      assert(app.config.httpclient.httpsAgent.maxSockets === 100);

      assert(app.config.httpclient.httpAgent.maxFreeSockets === 100);
      assert(app.config.httpclient.httpsAgent.maxFreeSockets === 100);

      assert(app.config.httpclient.httpAgent.keepAlive === false);
      assert(app.config.httpclient.httpsAgent.keepAlive === false);
    });
  });

  describe('httpclient.request.timeout = 100', () => {
    let app;
    before(() => {
      app = utils.app('apps/httpclient-request-timeout-100');
      return app.ready();
    });
    after(() => app.close());

    it('should set request default global timeout to 100ms', () => {
      return app.httpclient.curl(`${url}/timeout`)
        .catch(err => {
          assert(err);
          assert(err.name === 'ResponseTimeoutError');
          assert(err.message.includes('Response timeout for 100ms'));
        });
    });
  });
});
