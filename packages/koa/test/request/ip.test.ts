import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import Stream from 'node:stream';

import Koa from '../../src/index.ts';
import { request as createRequest } from '../test-helpers/context.ts';

describe('req.ip', () => {
  describe('with req.ips present', () => {
    it('should return req.ips[0]', () => {
      const app = new Koa();
      const req = {
        headers: {} as Record<string, string>,
        socket: new Stream.Duplex(),
      };
      app.proxy = true;
      req.headers['x-forwarded-for'] = '127.0.0.1';
      (req.socket as unknown as { remoteAddress: string }).remoteAddress =
        '127.0.0.2';
      const request = createRequest(req, undefined, app);
      assert.strictEqual(request.ip, '127.0.0.1');
    });
  });

  describe('with no req.ips present', () => {
    it('should return req.socket.remoteAddress', () => {
      const req = { socket: new Stream.Duplex() };
      (req.socket as unknown as { remoteAddress: string }).remoteAddress =
        '127.0.0.2';
      const request = createRequest(req);
      assert.strictEqual(request.ip, '127.0.0.2');
    });

    describe('with req.socket.remoteAddress not present', () => {
      it('should return an empty string', () => {
        const socket = new Stream.Duplex();
        Object.defineProperty(socket, 'remoteAddress', {
          get: () => undefined, // So that the helper doesn't override it with a reasonable value
          set: () => {
            // empty
          },
        });
        assert.strictEqual(createRequest({ socket }).ip, '');
      });
    });
  });

  it('should be lazy inited and cached', () => {
    const req = { socket: new Stream.Duplex() };
    (req.socket as unknown as { remoteAddress: string }).remoteAddress =
      '127.0.0.2';
    const request = createRequest(req);
    assert.strictEqual(request.ip, '127.0.0.2');
    (req.socket as unknown as { remoteAddress: string }).remoteAddress =
      '127.0.0.1';
    assert.strictEqual(request.ip, '127.0.0.2');
  });

  it('should reset ip work', () => {
    const req = { socket: new Stream.Duplex() };
    (req.socket as unknown as { remoteAddress: string }).remoteAddress =
      '127.0.0.2';
    const request = createRequest(req);
    assert.strictEqual(request.ip, '127.0.0.2');
    request.ip = '127.0.0.1';
    assert.strictEqual(request.ip, '127.0.0.1');
  });
});
