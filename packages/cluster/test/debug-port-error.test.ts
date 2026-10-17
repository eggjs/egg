import { strict as assert } from 'node:assert';
import { EventEmitter, once } from 'node:events';
import { createServer, type Server } from 'node:http';
import { fileURLToPath } from 'node:url';

import { describe, it, vi } from 'vitest';

import { startAppWorker } from '../src/worker_protocol/app.ts';

describe('test/debug-port-error.test.ts', () => {
  it.each(['http', 'https'])('handles an occupied separate debug port for %s', async (protocol) => {
    const blocker = createServer();
    let server: Server | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      // Match debugPortServer.listen(debugPort), including its default address family.
      blocker.listen(0);
      await once(blocker, 'listening');
      const address = blocker.address();
      assert.ok(address && typeof address !== 'string');

      const app = new EventEmitter() as any;
      app.config = { cluster: { listen: { port: 0 }, separateDebugServer: true } };
      app.options = {};
      app.ready = (callback: (err?: Error) => void) => callback();
      app.callback = () => (_request: unknown, response: { end(): void }) => response.end();
      app.close = () => {};
      app.once('server', (value: Server) => {
        server = value;
      });
      let resolveKilled: (() => void) | undefined;
      const killed = new Promise<void>((resolve, reject) => {
        resolveKilled = resolve;
        timeout = setTimeout(() => reject(new Error('Debug-port bind failure did not request worker exit')), 2000);
      });
      const kill = vi.fn(() => resolveKilled!());
      const logger = { error: vi.fn() } as any;
      startAppWorker(
        app,
        {
          debugPort: address.port,
          ...(protocol === 'https'
            ? {
                https: {
                  key: fileURLToPath(new URL('./fixtures/server.key', import.meta.url)),
                  cert: fileURLToPath(new URL('./fixtures/server.cert', import.meta.url)),
                },
              }
            : {}),
        },
        { workerId: 1, send() {}, kill, gracefulExit() {}, on() {} },
        logger,
      );
      await killed;

      assert.ok(server);
      assert.equal(server.listenerCount('error'), 1);
      assert.equal(kill.mock.calls.length, 1);
      assert.equal(logger.error.mock.calls.length, 1);
      assert.equal(logger.error.mock.calls[0][0], '[app_worker] server got error: %s, code: %s');
      assert.match(logger.error.mock.calls[0][1], /EADDRINUSE/);
      assert.equal(logger.error.mock.calls[0][2], 'EADDRINUSE');
    } finally {
      clearTimeout(timeout);
      await Promise.all(
        [server, blocker]
          .filter((value): value is Server => value !== undefined)
          .map((value) => new Promise<void>((resolve) => value.close(() => resolve()))),
      );
    }
  });
});
