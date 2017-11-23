'use strict';

const assert = require('assert');
const mm = require('egg-mock');
const Httpclient = require('../../../lib/core/httpclient');
const utils = require('../../utils');

describe('test/lib/core/httpclient.test.js', () => {
  let client;
  let url;

  before(() => {
    client = new Httpclient({
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

  describe('overwrite httpclient', () => {
    let app;
    before(() => {
      app = utils.app('apps/httpclient-overwrite');
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

    it('should assert url', () => {
      return app.httpclient.curl('unknown url')
        .catch(err => {
          assert(err);
          assert(err.message.includes('url should start with http, but got unknown url'));
        });
    });
  });

  describe('httpclient tracer', () => {
    const url = 'https://eggjs.org/';
    let app;
    before(() => {
      app = utils.app('apps/httpclient-tracer');
      return app.ready();
    });

    after(() => app.close());

    it('should app request auto set tracer', function* () {
      const httpclient = app.httpclient;

      let reqTracer;
      let resTracer;

      httpclient.on('request', function(options) {
        reqTracer = options.args.tracer;
      });

      httpclient.on('response', function(options) {
        resTracer = options.req.args.tracer;
      });

      let res = yield httpclient.request(url, {
        method: 'GET',
      });

      assert(res.status === 200);
      assert(reqTracer === resTracer);

      assert(reqTracer.traceId);
      assert(reqTracer.traceId === resTracer.traceId);

      reqTracer = null;
      resTracer = null;

      res = yield httpclient.request(url);

      assert(res.status === 200);
      assert(reqTracer === resTracer);

      assert(reqTracer.traceId);
      assert(reqTracer.traceId === resTracer.traceId);
    });

    it('should agent request auto set tracer', function* () {
      const httpclient = app.agent.httpclient;

      let reqTracer;
      let resTracer;

      httpclient.on('request', function(options) {
        reqTracer = options.args.tracer;
      });

      httpclient.on('response', function(options) {
        resTracer = options.req.args.tracer;
      });

      const res = yield httpclient.request(url, {
        method: 'GET',
      });

      assert(res.status === 200);
      assert(reqTracer === resTracer);

      assert(reqTracer.traceId);
      assert(reqTracer.traceId === resTracer.traceId);
    });

    it('should app request with ctx and tracer', function* () {
      const httpclient = app.httpclient;

      let reqTracer;
      let resTracer;

      httpclient.on('request', function(options) {
        reqTracer = options.args.tracer;
      });

      httpclient.on('response', function(options) {
        resTracer = options.req.args.tracer;
      });

      let res = yield httpclient.request(url, {
        method: 'GET',
      });

      assert(res.status === 200);

      assert(reqTracer.traceId);
      assert(reqTracer.traceId === resTracer.traceId);

      reqTracer = null;
      resTracer = null;
      res = yield httpclient.request(url, {
        method: 'GET',
        ctx: {},
        tracer: {
          id: '1234',
        },
      });

      assert(res.status === 200);
      assert(reqTracer.id === resTracer.id);
      assert(reqTracer.id === '1234');

      reqTracer = null;
      resTracer = null;
      res = yield httpclient.request(url, {
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
    let app;
    before(() => {
      app = utils.app('apps/httpclient-tracer');
    });

    after(() => app.close());

    it('should app request before ready use same tracer', function* () {
      const httpclient = app.httpclient;

      let reqTracers = [];
      let resTracers = [];

      httpclient.on('request', function(options) {
        reqTracers.push(options.args.tracer);
      });

      httpclient.on('response', function(options) {
        resTracers.push(options.req.args.tracer);
      });

      let res = yield httpclient.request(url, {
        method: 'GET',
        timeout: 20000,
      });
      assert(res.status === 200);


      res = yield httpclient.request('https://github.com', {
        method: 'GET',
        timeout: 20000,
      });

      assert(res.status === 200);

      res = yield httpclient.request('https://www.npmjs.com', {
        method: 'GET',
        timeout: 20000,
      });
      assert(res.status === 200);

      assert(reqTracers.length === 3);
      assert(resTracers.length === 3);

      assert(reqTracers[0] === reqTracers[1]);
      assert(reqTracers[1] === reqTracers[2]);

      assert(resTracers[0] === reqTracers[2]);
      assert(resTracers[1] === resTracers[0]);
      assert(resTracers[2] === resTracers[1]);

      assert(reqTracers[0].traceId);

      reqTracers = [];
      resTracers = [];

      yield app.ready();

      res = yield httpclient.request(url, {
        method: 'GET',
        timeout: 20000,
      });
      assert(res.status === 200);


      res = yield httpclient.request('https://github.com', {
        method: 'GET',
        timeout: 20000,
      });
      assert(res.status === 200);

      res = yield httpclient.request('https://www.npmjs.com', {
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

});
