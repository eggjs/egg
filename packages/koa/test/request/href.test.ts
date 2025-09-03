import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import Stream from 'node:stream';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

import Koa from '../../src/index.ts';
import context from '../test-helpers/context.ts';

describe('ctx.href', () => {
  it('should return the full request url', () => {
    const socket = new Stream.Duplex();
    const req = {
      url: '/users/1?next=/dashboard',
      headers: {
        host: 'localhost',
      },
      socket,
      __proto__: Stream.Readable.prototype,
    };
    const ctx = context(req);
    assert.strictEqual(ctx.href, 'http://localhost/users/1?next=/dashboard');
    // change it also work
    ctx.url = '/foo/users/1?next=/dashboard';
    assert.strictEqual(ctx.href, 'http://localhost/users/1?next=/dashboard');
  });

  it('should work with `GET http://example.com/foo`', done => {
    const app = new Koa();
    app.use(ctx => {
      ctx.body = ctx.href;
    });
    const server = app.listen(() => {
      const address = server.address() as AddressInfo;
      http.get(
        {
          host: 'localhost',
          path: 'http://example.com/foo',
          port: address.port,
        },
        res => {
          assert.strictEqual(res.statusCode, 200);
          let buf = '';
          res.setEncoding('utf8');
          res.on('data', s => {
            buf += s;
          });
          res.on('end', () => {
            assert.strictEqual(buf, 'http://example.com/foo');
            done();
          });
        }
      );
    });
  });
});
