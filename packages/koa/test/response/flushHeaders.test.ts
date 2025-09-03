import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import http from 'node:http';
import { describe, it } from 'node:test';
import { once } from 'node:events';
import { PassThrough } from 'node:stream';

import request from 'supertest';

import Koa, { type Context } from '../../src/index.ts';

describe('ctx.flushHeaders()', () => {
  it('should set headersSent', () => {
    const app = new Koa();

    app.use((ctx: Context) => {
      ctx.body = 'Body';
      ctx.status = 200;
      ctx.flushHeaders();
      assert.strictEqual(ctx.res.headersSent, true);
    });

    const server = app.listen();

    return request(server).get('/').expect(200).expect('Body');
  });

  it('should allow a response afterwards', () => {
    const app = new Koa();

    app.use((ctx: Context) => {
      ctx.status = 200;
      ctx.res.setHeader('Content-Type', 'text/plain');
      ctx.flushHeaders();
      ctx.body = 'Body';
    });

    const server = app.listen();
    return request(server)
      .get('/')
      .expect(200)
      .expect('Content-Type', 'text/plain')
      .expect('Body');
  });

  it('should send the correct status code', () => {
    const app = new Koa();

    app.use((ctx: Context) => {
      ctx.status = 401;
      ctx.res.setHeader('Content-Type', 'text/plain');
      ctx.flushHeaders();
      ctx.body = 'Body';
    });

    const server = app.listen();
    return request(server)
      .get('/')
      .expect(401)
      .expect('Content-Type', 'text/plain')
      .expect('Body');
  });

  it('should ignore set header after flushHeaders', async () => {
    const app = new Koa();

    app.use((ctx: Context) => {
      ctx.status = 401;
      ctx.res.setHeader('Content-Type', 'text/plain');
      ctx.flushHeaders();
      ctx.body = 'foo';
      ctx.set('X-Shouldnt-Work', 'Value');
      ctx.remove('Content-Type');
      ctx.vary('Content-Type');
    });

    const server = app.listen();
    const res = await request(server)
      .get('/')
      .expect(401)
      .expect('Content-Type', 'text/plain');

    assert.strictEqual(
      res.headers['x-shouldnt-work'],
      undefined,
      'header set after flushHeaders'
    );
    assert.strictEqual(
      res.headers.vary,
      undefined,
      'header set after flushHeaders'
    );
  });

  it('should flush headers first and delay to send data', async () => {
    const app = new Koa();

    app.use(ctx => {
      ctx.type = 'json';
      ctx.status = 200;
      ctx.headers.Link =
        '</css/mycss.css>; as=style; rel=preload, <https://img.craftflair.com>; rel=preconnect; crossorigin';
      const stream = new PassThrough();
      ctx.body = stream;
      ctx.flushHeaders();

      setTimeout(() => {
        stream.end(JSON.stringify({ message: 'hello!' }));
      }, 10_000);
    });

    let resolve: () => void;
    let reject: (err: Error) => void;
    // oxlint-disable-next-line avoid-new
    const promise = new Promise<void>((_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
    });

    // oxlint-disable-next-line promise/prefer-await-to-callbacks
    const server = app.listen((err: Error) => {
      if (err) return reject(err);

      const port = (server.address() as AddressInfo).port;

      http
        .request({
          port,
        })
        .on('response', res => {
          const onData = () => reject(new Error('boom'));
          res.on('data', onData);

          // shouldn't receive any data for a while
          setTimeout(() => {
            res.removeListener('data', onData);
            resolve();
          }, 1000);
        })
        .on('error', reject)
        .end();
    });

    await promise;
  });

  it('should catch stream error', async () => {
    const app = new Koa();
    app.once('error', err => {
      assert.equal(err.message, 'mock error');
    });

    app.use(ctx => {
      ctx.type = 'json';
      ctx.status = 200;
      ctx.headers.Link =
        '</css/mycss.css>; as=style; rel=preload, <https://img.craftflair.com>; rel=preconnect; crossorigin';
      ctx.length = 20;
      ctx.flushHeaders();
      const stream = new PassThrough();
      ctx.body = stream;

      setTimeout(() => {
        stream.emit('error', new Error('mock error'));
      }, 100);
    });

    const server = app.listen();

    request(server)
      .get('/')
      .end(() => {
        // ignore
      });

    const [err] = await once(app, 'error');
    assert.equal(err.message, 'mock error');
  });
});
