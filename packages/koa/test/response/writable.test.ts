import type { Server } from 'node:http';
import net, { type AddressInfo } from 'node:net';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';

import Koa from '../../src/index.ts';

describe('res.writable', () => {
  describe('when continuous requests in one persistent connection', () => {
    function requestTwice(
      server: Server,
      done: (err: Error | null, datas: Buffer[]) => void
    ) {
      const port = (server.address() as AddressInfo).port;
      const buf = Buffer.from(
        'GET / HTTP/1.1\r\nHost: localhost:' +
          port +
          '\r\nConnection: keep-alive\r\n\r\n'
      );
      const client = net.connect(port);
      const datas: Buffer[] = [];
      client
        .on('error', done)
        .on('data', data => datas.push(data))
        .on('end', () => done(null, datas));
      setImmediate(() => client.write(buf));
      setImmediate(() => client.write(buf));
      setTimeout(() => client.end(), 100);
    }

    it('should always be writable and respond to all requests', done => {
      const app = new Koa();
      let count = 0;
      app.use(ctx => {
        count++;
        ctx.body = 'request ' + count + ', writable: ' + ctx.writable;
      });

      const server = app.listen();
      requestTwice(server, (_: Error | null, datas: Buffer[]) => {
        const responses = Buffer.concat(datas).toString();
        assert.equal(/request 1, writable: true/.test(responses), true);
        assert.equal(/request 2, writable: true/.test(responses), true);
        done();
      });
    });
  });

  describe('when socket closed before response sent', () => {
    function requestClosed(server: Server) {
      const port = (server.address() as AddressInfo).port;
      const buf = Buffer.from(
        'GET / HTTP/1.1\r\nHost: localhost:' +
          port +
          '\r\nConnection: keep-alive\r\n\r\n'
      );
      const client = net.connect(port);
      setImmediate(() => {
        client.write(buf);
        client.end();
      });
    }

    it('should not be writable', done => {
      const app = new Koa();
      app.use(async ctx => {
        await sleep(1000);
        if (ctx.writable)
          return done(new Error('ctx.writable should not be true'));
        done();
      });
      const server = app.listen();
      requestClosed(server);
    });
  });

  describe('when response finished', () => {
    function request(server: Server) {
      const port = (server.address() as AddressInfo).port;
      const buf = Buffer.from(
        'GET / HTTP/1.1\r\nHost: localhost:' +
          port +
          '\r\nConnection: keep-alive\r\n\r\n'
      );
      const client = net.connect(port);
      setImmediate(() => {
        client.write(buf);
      });
      setTimeout(() => {
        client.end();
      }, 100);
    }

    it('should not be writable', done => {
      const app = new Koa();
      app.use(ctx => {
        ctx.res.end();
        if (ctx.writable)
          return done(new Error('ctx.writable should not be true'));
        done();
      });
      const server = app.listen();
      request(server);
    });
  });
});
