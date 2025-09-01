import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import { Server, AddressInfo } from 'node:net';
import { request } from '@eggjs/supertest';
import mm, { MockApplication } from '../src/index.js';
import { getFixtures } from './helper.js';

describe('test/mock_httpclient_next.test.ts', () => {
  let app: MockApplication;
  let server: Server;
  let url: string;
  let url2: string;
  before(() => {
    app = mm.app({
      baseDir: getFixtures('demo_next'),
    });
    return app.ready();
  });
  before(() => {
    server = app.listen();
    const address = server.address() as AddressInfo;
    url = `http://127.0.0.1:${address.port}/mock_url`;
    url2 = `http://127.0.0.1:${address.port}/mock_url2`;
  });
  after(() => app.close());
  afterEach(mm.restore);

  it('should mock url and get response event on urllib', async () => {
    app.mockCsrf();
    app.mockHttpclient(url, {
      data: Buffer.from('mock all response'),
    });

    app.httpclient.once('response', result => {
      assert('url' in result.req);
      // assert('size' in result.req);
      assert('options' in result.req);

      assert(result.res.status === 200);
      assert(result.res.statusCode === 200);
      assert.deepEqual(result.res.headers, {});
      assert(result.res.rt);
    });

    let count = 0;
    app.httpClient.on('response', result => {
      if (count === 0) {
        const options = result.req.options;
        assert(options.method === 'GET');
      } else if (count === 1) {
        const options = result.req.options;
        assert(options.method === 'POST');
        assert(options.headers['x-custom'] === 'custom');
      }
      count++;
    });
    await request(server)
      .get('/urllib')
      .expect({
        get: 'mock all response',
        post: 'mock all response',
      })
      .expect(200);
    assert.equal(count, 2);
    await mm.restore();
  });

  it('should mock url using app.mockAgent().intercept()', async () => {
    app.mockCsrf();
    app.mockAgent()
      .get(new URL(url).origin)
      .intercept({
        path: '/mock_url',
        method: 'GET',
      })
      .reply(200, 'mock GET response');
    app.mockAgent()
      .get(new URL(url).origin)
      .intercept({
        path: '/mock_url',
        method: 'POST',
      })
      .reply(200, 'mock POST response');

    await request(server)
      .get('/urllib')
      .expect({
        get: 'mock GET response',
        post: 'mock POST response',
      })
      .expect(200);
  });

  it('should support on streaming', async () => {
    const textFile = getFixtures('../mock_httpclient_next_h2.test.ts');
    app.mockHttpclient(url, 'get', {
      data: fs.readFileSync(textFile),
    });

    const res = await request(server)
      .get('/streaming')
      .expect(200);
    assert.match(res.body.toString(), /should support on streaming/);
    assert.equal(res.body.toString(), fs.readFileSync(textFile, 'utf8'));
  });

  it('should mock url support multi method', async () => {
    app.mockCsrf();
    app.mockHttpclient(url, [ 'get', 'post' ], {
      data: Buffer.from('mock response'),
    });

    await request(server)
      .get('/urllib')
      .expect({
        get: 'mock response',
        post: 'mock response',
      })
      .expect(200);
  });

  it('should mockHttpclient call multi times work with Regex', async () => {
    app.mockCsrf();
    app.mockHttpclient(/\/not\/match\//, {
      data: Buffer.from('mock not match response'),
    });
    app.mockHttpclient(/\/mock_url/, {
      data: Buffer.from('mock 1 match response'),
    });
    app.mockHttpclient(/\/mock_url/, {
      data: Buffer.from('mock 2 match response'),
    });

    await request(server)
      .get('/urllib')
      .expect({
        get: 'mock 1 match response',
        post: 'mock 1 match response',
      })
      .expect(200);
  });

  it('should mockHttpclient call multi times work with url string', async () => {
    app.mockCsrf();
    app.mockHttpclient(`${url}-not-match`, {
      data: Buffer.from('mock not match response'),
    });
    app.mockHttpclient(url, {
      data: Buffer.from('mock 1 match response'),
    });
    app.mockHttpclient(url, {
      data: Buffer.from('mock 2 match response'),
    });

    await request(server)
      .get('/urllib')
      .expect({
        get: 'mock 1 match response',
        post: 'mock 1 match response',
      })
      .expect(200);
  });

  it('should mock url method support *', async () => {
    app.mockCsrf();
    app.mockHttpclient(url, '*', {
      data: Buffer.from('mock * response'),
    });

    await request(server)
      .get('/urllib')
      .expect({
        get: 'mock * response',
        post: 'mock * response',
      })
      .expect(200);
  });

  it('should mock url post', async () => {
    app.mockCsrf();
    app.mockHttpclient(url, 'post', {
      data: Buffer.from('mock url post'),
    });

    await request(server)
      .get('/urllib')
      .expect({
        get: 'url get',
        post: 'mock url post',
      })
      .expect(200);
  });

  it('should auto restore after each case', async () => {
    app.mockCsrf();
    await request(server)
      .get('/urllib')
      .expect({
        get: 'url get',
        post: 'url post',
      })
      .expect(200);
  });

  it('should use first mock data on duplicate url mock', async () => {
    app.mockCsrf();
    app.mockHttpclient(url, 'post', {
      data: Buffer.from('mock url1 first post'),
    });
    // should ignore this same url mock data, use the first mock data
    app.mockHttpclient(url, 'post', {
      data: Buffer.from('mock url1 second post'),
    });
    app.mockHttpclient(url2, 'post', {
      data: Buffer.from('mock url2 post'),
    });

    await request(server)
      .get('/urllib')
      .expect({
        get: 'url get',
        post: 'mock url1 first post',
      })
      .expect(200);
    await request(server)
      .get('/urllib')
      .query({
        mock_url: '/mock_url2',
      })
      .expect({
        get: 'url get',
        post: 'mock url2 post',
      })
      .expect(200);
  });

  it('should mock work on query', async () => {
    app.mockCsrf();
    // mockHttpclient not support query, should use mockAgent instead
    app.mockHttpclient(`${url}?foo=foo1`, 'get', {
      data: Buffer.from('mock foo1'),
    });
    app.mockHttpclient(`${url}?foo=foo2`, 'get', {
      data: Buffer.from('mock foo1'),
    });
    await request(server)
      .get('/urllib')
      .query({ foo: 'foo1' })
      .expect({
        get: 'mock foo1',
        post: 'url post',
      })
      .expect(200);
    await request(server)
      .get('/urllib')
      .query({ foo: 'foo2' })
      .expect({
        get: 'mock foo1',
        post: 'url post',
      })
      .expect(200);
    await app.mockAgentRestore();

    app.mockAgent().get(new URL(url).origin)
      .intercept({
        path: '/mock_url?foo=foo1',
        method: 'GET',
      })
      .reply(200, 'mock new foo1');
    app.mockAgent().get(new URL(url).origin)
      .intercept({
        path: '/mock_url?foo=foo2',
        method: 'GET',
      })
      .reply(200, 'mock new foo2');
    await request(server)
      .get('/urllib')
      .query({ foo: 'foo1' })
      .expect({
        get: 'mock new foo1',
        post: 'url post',
      })
      .expect(200);
    await request(server)
      .get('/urllib')
      .query({ foo: 'foo2' })
      .expect({
        get: 'mock new foo2',
        post: 'url post',
      })
      .expect(200);
  });

  it('should mock url get and post', async () => {
    app.mockCsrf();
    app.mockHttpclient(url, 'post', {
      data: 'mock url post',
    });
    app.mockHttpclient(url, {
      data: 'mock url get',
    });

    await request(server)
      .get('/urllib')
      .expect({
        get: 'mock url get',
        post: 'mock url post',
      })
      .expect(200);
  });

  it('should support request', async () => {
    app.mockCsrf();
    app.mockHttpclient(url, 'post', {
      data: 'mock url post',
    });
    app.mockHttpclient(url, {
      data: 'mock url get',
    });

    await request(server)
      .get('/urllib?method=request')
      .expect({
        get: 'mock url get',
        post: 'mock url post',
      })
      .expect(200);
  });

  it('should support persist = false', async () => {
    app.mockCsrf();
    app.mockHttpclient(url, {
      data: 'mock url',
      persist: false,
    });

    await request(server)
      .get('/urllib?method=request')
      .expect({
        get: 'mock url',
        post: 'url post',
      })
      .expect(200);
  });

  it('should support persist = true and ignore repeats = 1', async () => {
    app.mockCsrf();
    app.mockHttpclient(url, {
      data: 'mock url',
      persist: true,
      repeats: 1,
    });

    await request(server)
      .get('/urllib?method=request')
      .expect({
        get: 'mock url',
        post: 'mock url',
      })
      .expect(200);
  });

  it('should support persist = false and repeats = 2', async () => {
    app.mockCsrf();
    app.mockHttpclient(url, {
      data: 'mock url',
      delay: 100,
      persist: false,
      repeats: 2,
    });

    await request(server)
      .get('/urllib?method=request')
      .expect({
        get: 'mock url',
        post: 'mock url',
      })
      .expect(200);

    await request(server)
      .get('/urllib?method=request')
      .expect({
        get: 'url get',
        post: 'url post',
      })
      .expect(200);
  });

  it('should support curl', async () => {
    app.mockCsrf();
    app.mockHttpclient(url, 'post', {
      data: 'mock url post',
    });
    app.mockHttpclient(url, {
      data: 'mock url get',
    });

    await request(server)
      .get('/urllib?method=curl')
      .expect({
        get: 'mock url get',
        post: 'mock url post',
      })
      .expect(200);
  });

  it('should support json', async () => {
    app.mockCsrf();
    app.mockHttpclient(url, 'get', {
      data: { method: 'get' },
    });
    app.mockHttpclient(url, 'post', {
      data: { method: 'post' },
    });

    await request(server)
      .get('/urllib?dataType=json')
      .expect({
        get: { method: 'get' },
        post: { method: 'post' },
      })
      .expect(200);
  });

  it('should support text', async () => {
    app.mockCsrf();
    app.mockHttpclient(url, 'post', {
      data: 'mock url post',
    });
    app.mockHttpclient(url, {
      data: 'mock url get',
    });

    await request(server)
      .get('/urllib?dataType=text')
      .expect({
        get: 'mock url get',
        post: 'mock url post',
      })
      .expect(200);
  });

  it('should exits req headers', async () => {
    app.mockCsrf();
    app.mockHttpclient(url, {
      data: 'mock url test',
    });
    await request(server)
      .get('/mock_urllib')
      .expect({})
      .expect(200);
  });

  it('should mock url path support RegExp', async () => {
    app.mockCsrf();
    app.mockHttpclient(/\/mock_url$/, {
      data: Buffer.from('mock response'),
    });

    await request(server)
      .get('/urllib')
      .expect({
        get: 'mock response',
        post: 'mock response',
      })
      .expect(200);
  });

  it('should mock full url support RegExp', async () => {
    app.mockCsrf();
    app.mockHttpclient(/http:\/\/127\.0\.0\.1:\d+\/mock_url$/, [ 'get', 'post' ], {
      data: Buffer.from('mock full 127 url response'),
    });

    await request(server)
      .get('/urllib')
      .expect({
        get: 'mock full 127 url response',
        post: 'mock full 127 url response',
      })
      .expect(200);
  });

  it('should use copy of mock data', async () => {
    app.mockCsrf();
    app.mockHttpclient(/\/mock_url$/, {
      data: { a: 1 },
    });

    await request(server)
      .get('/data_type')
      .expect({
        a: 1,
      })
      .expect(200);

    await request(server)
      .get('/data_type')
      .expect({
        a: 1,
      })
      .expect(200);
  });

  it('should support fn', async () => {
    app.mockCsrf();
    app.mockHttpClient(url, 'get', (url, opt) => {
      return `mock ${url} with ${opt.path}`;
    });
    app.mockHttpClient(url, 'post', 'mock url post');

    await request(server)
      .get('/urllib')
      .query({ data: JSON.stringify({ a: 'b' }) })
      .expect({
        get: `mock ${url}?a=b with /mock_url?a=b`,
        post: 'mock url post',
      })
      .expect(200);
  });

  it('should mock fn with multi-request without error', async () => {
    app.mockCsrf();
    let i = 0;
    app.mockHttpclient(url, 'post', (a, b) => {
      assert(a);
      assert(b);
      i++;
      return { data: 'mock url post' };
    });

    await request(server).get('/urllib').expect(200);
    await request(server).get('/urllib').expect(200);
    await request(server).get('/urllib').expect(200);
    assert(i === 3);
  });
});
