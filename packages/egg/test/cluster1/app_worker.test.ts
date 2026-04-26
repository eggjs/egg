import { strict as assert } from 'node:assert';
import net from 'node:net';
import { scheduler } from 'node:timers/promises';

import { request } from '@eggjs/supertest';
import { ip } from 'address';
import { describe, it, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';

import { cluster, type MockApplication } from '../utils.ts';

const DEFAULT_BAD_REQUEST_HTML = `<html>
  <head><title>400 Bad Request</title></head>
  <body bgcolor="white">
  <center><h1>400 Bad Request</h1></center>
  <hr><center>❤</center>
  </body>
  </html>`;

describe('test/cluster1/app_worker.test.ts', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = cluster('apps/app-server');
    await app.ready();
  });
  afterAll(() => app.close());

  // FIXME: unsable
  it.skip('should start cluster success and app worker emit `server` event', async () => {
    await app.httpRequest().get('/').expect('true');
  });

  it('should response 400 bad request when HTTP request packet broken', async () => {
    // Node.js will emit a clientError when the raw URI in the HTTP request
    // packet contains spaces. Send raw packets because modern clients reject
    // unescaped paths before they reach the server.
    const responses = await Promise.all([rawRequest(app.port, '/foo bar'), rawRequest(app.port, '/foo baz')]);

    for (const response of responses) {
      const separatorIndex = response.indexOf('\r\n\r\n');
      assert.notEqual(separatorIndex, -1);
      const header = response.slice(0, separatorIndex);
      const body = response.slice(separatorIndex + 4);
      assert.match(header, /^HTTP\/1\.1 400 Bad Request/);
      assert.equal(body.replaceAll('\r\n', '\n'), DEFAULT_BAD_REQUEST_HTML.replaceAll('\r\n', '\n'));
    }
  });

  describe.skip('server timeout', () => {
    let app: MockApplication;
    beforeEach(() => {
      app = cluster('apps/app-server-timeout');
      // app.debug();
      return app.ready();
    });
    afterEach(() => app.close());

    it('should not timeout', () => {
      return app.httpRequest().get('/').expect(200);
    });

    it('should timeout', async () => {
      await assert.rejects(async () => {
        await app.httpRequest().get('/timeout');
      }, /socket hang up/);
      app.expect('stdout', /\[http_server] A request `GET \/timeout` timeout with client/);
    });
  });

  describe.skip('customized client error', () => {
    let app: MockApplication;
    beforeEach(() => {
      app = cluster('apps/app-server-customized-client-error');
      // app.debug();
      return app.ready();
    });
    afterEach(() => app.close());

    it('should do customized request when HTTP request packet broken', async () => {
      const version = process.version.split('.').map((a) => parseInt(a.replace('v', '')));
      let html: string | RegExp = '';
      if ((version[0] === 8 && version[1] >= 10) || (version[0] === 9 && version[1] >= 4) || version[0] > 9) {
        html = new RegExp(
          'GET /foo bar HTTP/1.1\r\nHost: 127.0.0.1:\\d+\r\nAccept-Encoding: gzip, ' +
            'deflate\r\nUser-Agent: @eggjs/mock/\\d+.\\d+.\\d+ Node\\.js/v\\d+.\\d+.\\d+\r\nConnection: close\r\n\r\n',
        );
      }

      // customized client error response
      const test1 = app.httpRequest().get('/foo bar');
      (test1 as any).request().path = '/foo bar';
      await test1.expect(html).expect('foo', 'bar').expect('content-length', '147').expect(418);

      // customized client error handle function throws
      const test2 = app.httpRequest().get('/foo bar');
      (test2 as any).request().path = '/foo bar';
      await test2.expect(DEFAULT_BAD_REQUEST_HTML).expect(400);
    });

    it('should not log when there is no rawPacket', async () => {
      await connect(app.port);
      await scheduler.wait(1000);
      app.expect('stderr', /HPE_INVALID_EOF_STATE/);
      app.notExpect('stderr', /A client/);
    });
  });

  describe.skipIf(process.platform === 'win32')('listen hostname', () => {
    let app: MockApplication;
    beforeAll(async () => {
      app = cluster('apps/app-server-with-hostname');
      await app.ready();
    });
    afterAll(() => app.close());

    it('should refuse other ip', async () => {
      const url = ip() + ':' + app.port;

      await request(url).get('/').expect('done').expect(200);
      // try {
      //   await request('http://127.0.0.1:17010')
      //     .get('/')
      //     .expect('done')
      //     .expect(200);
      //   throw new Error('should not run');
      // } catch (err: any) {
      //   assert(err.message === 'ECONNREFUSED: Connection refused');
      // }
    });
  });
});

function connect(port: number) {
  return new Promise<void>((resolve) => {
    const socket = net.createConnection(port, '127.0.0.1', () => {
      socket.write('GET http://127.0.0.1:8080/ HTTP', () => {
        socket.destroy();
        resolve();
      });
    });
  });
}

function rawRequest(port: number, path: string) {
  return new Promise<string>((resolve, reject) => {
    let response = '';
    let settled = false;
    const socket = net.createConnection(port, '127.0.0.1', () => {
      socket.write(`GET ${path} HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nConnection: close\r\n\r\n`);
    });

    const settle = (callback: () => void) => {
      if (settled) return;
      settled = true;
      socket.setTimeout(0);
      callback();
    };

    socket.setEncoding('utf8');
    socket.setTimeout(5000, () =>
      settle(() => {
        socket.destroy();
        reject(new Error(`Timed out waiting for raw HTTP response, partial response: ${response}`));
      }),
    );
    socket.on('data', (chunk) => {
      response += chunk;
    });
    socket.on('end', () => settle(() => resolve(response)));
    socket.on('error', (err) => settle(() => reject(err)));
    socket.on('close', (hadError) => {
      if (!hadError) {
        settle(() => resolve(response));
      }
    });
  });
}
