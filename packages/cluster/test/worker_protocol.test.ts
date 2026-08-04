import { strict as assert } from 'node:assert';
import { EventEmitter, once } from 'node:events';
import type { Server } from 'node:http';
import { Worker } from 'node:worker_threads';

import { describe, it, vi } from 'vitest';

import { startAgentWorker, startAppWorker } from '../src/worker_protocol/index.ts';

vi.mock('node:http', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:http')>();
  const { EventEmitter: MockEventEmitter } = await import('node:events');

  return {
    ...original,
    createServer() {
      const server = new MockEventEmitter() as any;
      server.listening = false;
      server.address = () => ({ address: '127.0.0.1', family: 'IPv4', port: 0 });
      server.listen = () => {
        server.listening = true;
        queueMicrotask(() => server.emit('listening'));
        return server;
      };
      server.close = (callback?: (err?: Error) => void) => {
        server.listening = false;
        callback?.();
      };
      return server;
    },
  };
});

describe('test/worker_protocol.test.ts', () => {
  it('uses parentPort without terminating the main process', async () => {
    const worker = new Worker(new URL('./fixtures/worker-thread-io.mjs', import.meta.url));
    const workerId = worker.threadId;

    const [message] = await once(worker, 'message');
    assert.deepEqual(message, {
      action: 'ready',
      senderWorkerId: String(workerId),
    });

    worker.postMessage('kill');
    const [exitCode] = await once(worker, 'exit');
    assert.equal(exitCode, 1);
  });

  it('removes the startup error listener from an already-ready agent', () => {
    const agent = new EventEmitter() as any;
    agent.ready = (callback: (err?: Error) => void) => callback();
    agent.close = () => {};

    const messages: unknown[] = [];
    startAgentWorker(agent, {
      send(message) {
        messages.push(message);
      },
      kill() {
        assert.fail('already-ready agent should not be killed');
      },
      gracefulExit() {},
    });

    assert.equal(agent.listenerCount('error'), 0);
    assert.deepEqual(messages, [{ action: 'agent-start', to: 'master' }]);
  });

  it('removes the startup timeout listener from an already-ready app', async () => {
    const app = new EventEmitter() as any;
    app.config = { cluster: { listen: { port: 0 } } };
    app.options = {};
    app.ready = (callback: (err?: Error) => void) => callback();
    app.callback = () => (_request: unknown, response: { end(): void }) => response.end();
    app.close = () => {};

    let server: Server | undefined;
    app.once('server', (value: Server) => {
      server = value;
    });

    startAppWorker(
      app,
      {},
      {
        workerId: 1,
        send() {},
        kill() {
          assert.fail('already-ready app should not be killed');
        },
        gracefulExit() {},
        on() {},
      },
    );

    assert.equal(app.listenerCount('startTimeout'), 0);
    if (!server) {
      assert.fail('already-ready app should create a server');
    }
    const runningServer = server;
    if (!runningServer.listening) {
      await once(runningServer, 'listening');
    }
    await new Promise<void>((resolve, reject) => {
      runningServer.close((err) => (err ? reject(err) : resolve()));
    });
  });
});
