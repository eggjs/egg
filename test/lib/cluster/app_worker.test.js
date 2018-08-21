'use strict';

const net = require('net');
const request = require('supertest');
const address = require('address');
const assert = require('assert');
const sleep = require('mz-modules/sleep');
const utils = require('../../utils');

const DEFAULT_BAD_REQUEST_HTML = `<html>
  <head><title>400 Bad Request</title></head>
  <body bgcolor="white">
  <center><h1>400 Bad Request</h1></center>
  <hr><center>❤</center>
  </body>
  </html>`;

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

    await Promise.all([
      test1.expect(DEFAULT_BAD_REQUEST_HTML).expect(400),
      test2.expect(DEFAULT_BAD_REQUEST_HTML).expect(400),
    ]);
  });

  describe('customized client error', () => {
    let app;
    before(() => {
      app = utils.cluster('apps/app-server-customized-client-error');
      app.debug();
      console.log(app.port);
      return app.ready();
    });
    after(() => app.close());

    it('should do customized request when HTTP request packet broken', async () => {
      const version = process.version.split('.').map(a => parseInt(a.replace('v', '')));
      let html = '';
      if ((version[0] === 8 && version[1] >= 10) ||
        (version[0] === 9 && version[1] >= 4) ||
        version[0] > 9) {
        html = new RegExp(
          'GET /foo bar HTTP/1.1\r\nHost: 127.0.0.1:\\d+\r\nAccept-Encoding: gzip, ' +
          'deflate\r\nUser-Agent: node-superagent/\\d+\\.\\d+\\.\\d+\r\nConnection: close\r\n\r\n');
      }

      // customized client error response
      const test1 = app.httpRequest().get('/foo bar');
      test1.request().path = '/foo bar';
      await test1.expect(html).expect('foo', 'bar').expect(418);

      // customized client error handle function throws
      const test2 = app.httpRequest().get('/foo bar');
      test2.request().path = '/foo bar';
      await test2.expect(DEFAULT_BAD_REQUEST_HTML).expect(400);
    });

    it.only('should not log when there is no rawPacket', done => {
      const socket = net.createConnection({ port: app.port }, () => {
        sleep(5000).then(() => {
          socket.end('http');
          done();
        });
      });
    });

  });

  describe('listen hostname', () => {
    let app;
    before(() => {
      app = utils.cluster('apps/app-server-with-hostname');
      return app.ready();
    });
    after(() => app.close());

    it('should refuse other ip', async () => {
      const url = address.ip() + ':' + app.port;

      await request(url)
        .get('/')
        .expect('done')
        .expect(200);

      try {
        await request('http://127.0.0.1:17010')
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
