import { pending } from 'pedding';
import { strict as assert } from 'node:assert';
import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';

import mm, { type MockApplication } from '../src/index.ts';
import { getFixtures } from './helper.ts';

const url = 'http://127.0.0.1:9989/mock_url';

describe.skip('test/mock_agent_httpclient.test.ts', () => {
  let app: MockApplication;
  let agent: any;
  let httpclient: any;
  beforeAll(() => {
    app = mm.app({
      baseDir: getFixtures('demo'),
    });
    return app.ready();
  });
  beforeAll(() => {
    agent = (app as any).agent;
    httpclient = crtHttpclient(agent);
  });
  afterAll(() => agent.close());
  afterEach(mm.restore);

  it('should mock url and get response event on urllib', done => {
    // @ts-ignore - intentionally overriding done callback with pending wrapper
    done = pending(3, done);
    agent.mockHttpclient(url, {
      data: Buffer.from('mock response'),
    });

    agent.httpclient.once('request', function (meta: any) {
      assert('url' in meta);
      assert('args' in meta);
      // @ts-ignore
      done();
    });

    agent.httpclient.once('response', function (result: any) {
      assert('url' in result.req);
      assert('options' in result.req);

      assert.equal(result.res.status, 200);
      // @ts-ignore
      done();
    });

    let count = 0;
    agent.httpclient.on('response', function (result: any) {
      if (count === 0) {
        assert.equal(result.req.options.method, 'GET');
        //   assert.deepEqual(result.req.options, {
        //     dataType: undefined,
        //     method: 'GET',
        //     headers: {},
        //   });
      } else if (count === 1) {
        assert.equal(result.req.options.method, 'POST');
        //   assert.deepEqual(result.req.options, {
        //     dataType: undefined,
        //     method: 'POST',
        //     headers: {
        //       'x-custom': 'custom',
        //     },
        //   });
      }
      count++;
    });

    httpclient().then((data: any) => {
      assert.deepEqual(data, {
        get: 'mock response',
        post: 'mock response',
      });
      // @ts-ignore
      done();
    });
  });

  it('should mock url support multi method', done => {
    // @ts-ignore - intentionally overriding done callback with pending wrapper
    done = pending(2, done);
    agent.mockHttpclient(url, ['get', 'post'], {
      data: Buffer.from('mock response'),
    });

    agent.httpclient.once('response', function (result: any) {
      assert.equal(result.res.status, 200);
      // assert.deepEqual(result.res, {
      //   status: 200,
      //   statusCode: 200,
      //   headers: {},
      //   size: 13,
      //   aborted: false,
      //   rt: 1,
      //   keepAliveSocket: false,
      // });
      // @ts-ignore
      done();
    });

    httpclient().then((data: any) => {
      assert.deepEqual(data, {
        get: 'mock response',
        post: 'mock response',
      });
      // @ts-ignore
      done();
    });
  });

  it('should mock url method support *', done => {
    // @ts-ignore - intentionally overriding done callback with pending wrapper
    done = pending(2, done);
    agent.mockHttpclient(url, '*', {
      data: Buffer.from('mock response'),
    });

    agent.httpclient.once('response', function (result: any) {
      assert.equal(result.res.status, 200);
      // assert.deepEqual(result.res, {
      //   status: 200,
      //   statusCode: 200,
      //   headers: {},
      //   size: 13,
      //   aborted: false,
      //   rt: 1,
      //   keepAliveSocket: false,
      // });
      // @ts-ignore
      done();
    });

    httpclient().then((data: any) => {
      assert.deepEqual(data, {
        get: 'mock response',
        post: 'mock response',
      });
      // @ts-ignore
      done();
    });
  });

  it('should mock url get and post', done => {
    agent.mockHttpclient(url, 'get', {
      data: 'mock url get',
    });
    agent.mockHttpclient(url, 'post', {
      data: 'mock url post',
    });

    httpclient().then((data: any) => {
      assert.deepEqual(data, {
        get: 'mock url get',
        post: 'mock url post',
      });
      // @ts-ignore
      done();
    });
  });

  it('should support request', done => {
    agent.mockHttpclient(url, 'get', {
      data: 'mock url get',
    });
    agent.mockHttpclient(url, 'post', {
      data: 'mock url post',
    });

    httpclient('request').then((data: any) => {
      assert.deepEqual(data, {
        get: 'mock url get',
        post: 'mock url post',
      });
      // @ts-ignore
      done();
    });
  });

  it('should set default method to *', done => {
    agent.mockHttpclient(url, {
      data: 'mock url *',
    });
    agent.mockHttpclient(url, 'post', {
      data: 'mock url post',
    });

    httpclient('request').then((data: any) => {
      assert.deepEqual(data, {
        get: 'mock url *',
        post: 'mock url *',
      });
      // @ts-ignore
      done();
    });
  });

  it('should support curl', done => {
    agent.mockHttpclient(url, 'get', {
      data: 'mock url get',
    });
    agent.mockHttpclient(url, 'post', {
      data: 'mock url post',
    });

    httpclient('curl').then((data: any) => {
      assert.deepEqual(data, {
        get: 'mock url get',
        post: 'mock url post',
      });
      // @ts-ignore
      done();
    });
  });

  it('should support json', done => {
    agent.mockHttpclient(url, 'get', {
      data: { method: 'get' },
    });
    agent.mockHttpclient(url, 'post', {
      data: { method: 'post' },
    });

    httpclient('request', 'json').then((data: any) => {
      assert.deepEqual(data, {
        get: { method: 'get' },
        post: { method: 'post' },
      });
      // @ts-ignore
      done();
    });
  });

  it('should support text', done => {
    agent.mockHttpclient(url, 'get', {
      data: 'mock url get',
    });
    agent.mockHttpclient(url, 'post', {
      data: 'mock url post',
    });

    httpclient('request', 'text').then((data: any) => {
      assert.deepEqual(data, {
        get: 'mock url get',
        post: 'mock url post',
      });
      // @ts-ignore
      done();
    });
  });

  it('should mock url and get response event on urllib', done => {
    agent.mockHttpclient(url, {
      data: Buffer.from('mock response'),
    });

    httpclient().then((data: any) => {
      assert.deepEqual(data, {
        get: 'mock response',
        post: 'mock response',
      });
      // @ts-ignore
      done();
    });
  });
});

function crtHttpclient(app: any) {
  return function request(method: string = 'request', dataType?: string) {
    const r1 = app.httpclient[method](url, {
      dataType,
    });

    const r2 = app.httpclient[method](url, {
      method: 'POST',
      dataType,
      headers: {
        'x-custom': 'custom',
      },
    });
    return Promise.all([r1, r2]).then(([r1, r2]) => {
      return {
        get: Buffer.isBuffer(r1.data) ? r1.data.toString() : r1.data,
        post: Buffer.isBuffer(r2.data) ? r2.data.toString() : r2.data,
      };
    });
  };
}
