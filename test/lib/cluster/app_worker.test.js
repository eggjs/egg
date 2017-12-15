'use strict';

const request = require('supertest');
const address = require('address');
const assert = require('assert');
const utils = require('../../utils');

describe('test/lib/cluster/app_worker.test.js', () => {
  let app;
  before(() => {
    app = utils.cluster('apps/app-server');
    return app.ready();
  });
  after(() => app.close());

  it('should start cluster success and app worker emit `server` event', () => {
    return app.httpRequest()
      .get('/')
      .expect('true');
  });

  it('should response 400 bad request when HTTP request packet broken', async () => {
    const test1 = app.httpRequest()
      // Node.js (http-parser) will occur an error while the raw URI in HTTP
      // request packet containing space.
      //
      // Refs: https://zhuanlan.zhihu.com/p/31966196
      .get('/foo bar');
    const test2 = app.httpRequest().get('/foo baz');

    // app.httpRequest().expect() will encode the uri so that we cannot
    // request the server with raw `/foo bar` to emit 400 status code.
    //
    // So we generate `test.req` via `test.request()` first and override the
    // encoded uri.
    //
    // `test.req` will only generated once:
    //
    //   ```
    //   function Request::request() {
    //     if (this.req) return this.req;
    //
    //     // code to generate this.req
    //
    //     return this.req;
    //   }
    //   ```
    test1.request().path = '/foo bar';
    test2.request().path = '/foo baz';

    const html = `<html>
  <head><title>400 Bad Request</title></head>
  <body bgcolor="white">
  <center><h1>400 Bad Request</h1></center>
  <hr><center>❤</center>
  </body>
  </html>`;

    await Promise.all([
      test1.expect(html).expect(400),
      test2.expect(html).expect(400),
    ]);
  });

  describe('listen hostname', () => {
    let app;
    before(() => {
      app = utils.cluster('apps/app-server-with-hostname');
      return app.ready();
    });
    after(() => app.close());

    it('should refuse other ip', function* () {
      const url = address.ip() + ':' + app.port;

      yield request(url)
        .get('/')
        .expect('done')
        .expect(200);

      try {
        yield request('http://127.0.0.1:17010')
          .get('/')
          .expect('done')
          .expect(200);
        throw new Error('should not run');
      } catch (err) {
        assert(err.message === 'ECONNREFUSED: Connection refused');
      }
    });
  });

});
