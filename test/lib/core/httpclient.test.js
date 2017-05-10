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
        httpclient: {},
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
});
