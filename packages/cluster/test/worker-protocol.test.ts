import { strict as assert } from 'node:assert';
import { EventEmitter, once } from 'node:events';
import type { Server } from 'node:http';
import os from 'node:os';
import { Worker } from 'node:worker_threads';

import { describe, it, vi } from 'vitest';

import { startAgentWorker } from '../src/worker_protocol/agent.ts';
import { startAppWorker } from '../src/worker_protocol/app.ts';
import { WORKER_THREAD_GRACEFUL_EXIT } from '../src/worker_protocol/worker-thread.ts';

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

describe('test/worker-protocol.test.ts', () => {
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

  it('awaits worker-thread cleanup before exiting', async () => {
    const worker = new Worker(new URL('./fixtures/worker-thread-io.mjs', import.meta.url));
    await once(worker, 'message');

    const exitPromise = once(worker, 'exit');
    worker.postMessage(WORKER_THREAD_GRACEFUL_EXIT);
    const [message] = await once(worker, 'message');
    const [exitCode] = await exitPromise;

    assert.equal(message.action, 'closed');
    assert.equal(exitCode, 0);
  });

  it('removes the startup error listener from an already-ready agent', () => {
    const agent = new EventEmitter() as any;
    agent.ready = (callback: (err?: Error) => void) => callback();
    agent.close = vi.fn();

    const messages: unknown[] = [];
    let gracefulExitOptions: { beforeExit(): unknown } | undefined;
    startAgentWorker(agent, {
      send(message) {
        messages.push(message);
      },
      kill() {
        assert.fail('already-ready agent should not be killed');
      },
      gracefulExit(options) {
        gracefulExitOptions = options as typeof gracefulExitOptions;
      },
    });

    assert.equal(agent.listenerCount('error'), 0);
    assert.deepEqual(messages, [{ action: 'agent-start', to: 'master' }]);
    assert.ok(gracefulExitOptions);
    gracefulExitOptions.beforeExit();
    assert.equal(agent.close.mock.calls.length, 1);
  });

  it('kills an agent that emits an error during startup', () => {
    const readyError = new Error('agent start failed');
    const agent = new EventEmitter() as any;
    agent.ready = (callback: (err?: Error) => void) => callback(readyError);
    agent.close = () => {};

    const kill = vi.fn();
    const gracefulExit = vi.fn();
    const logger = { error: vi.fn() } as any;
    startAgentWorker(
      agent,
      {
        send() {
          assert.fail('failed agent should not report agent-start');
        },
        kill,
        gracefulExit,
      },
      logger,
    );
    agent.emit('error', readyError);

    assert.equal(kill.mock.calls.length, 1);
    assert.equal(gracefulExit.mock.calls.length, 1);
    assert.deepEqual(logger.error.mock.calls, [[readyError], ['[agent_worker] start error, exiting with code:1']]);
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

  it('kills an app that fails or times out during startup', () => {
    const readyError = new Error('app start failed');
    const failedApp = new EventEmitter() as any;
    failedApp.ready = (callback: (err?: Error) => void) => callback(readyError);
    failedApp.close = () => {};

    const failedKill = vi.fn();
    const failedLogger = { error: vi.fn() } as any;
    startAppWorker(
      failedApp,
      {},
      {
        workerId: 1,
        send() {
          assert.fail('failed app should not report startup messages');
        },
        kill: failedKill,
        gracefulExit() {},
        on() {},
      },
      failedLogger,
    );
    assert.equal(failedKill.mock.calls.length, 1);
    assert.deepEqual(failedLogger.error.mock.calls, [[readyError], ['[app_worker] start error, exiting with code:1']]);

    const timedOutApp = new EventEmitter() as any;
    timedOutApp.ready = () => {};
    timedOutApp.close = () => {};
    const timeoutKill = vi.fn();
    const timeoutLogger = { error: vi.fn() } as any;
    startAppWorker(
      timedOutApp,
      {},
      {
        workerId: 1,
        send() {},
        kill: timeoutKill,
        gracefulExit() {},
        on() {},
      },
      timeoutLogger,
    );
    timedOutApp.emit('startTimeout');

    assert.equal(timeoutKill.mock.calls.length, 1);
    assert.deepEqual(timeoutLogger.error.mock.calls, [['[app_worker] start timeout, exiting with code:1']]);
  });

  it('supports sticky-session messages', async () => {
    const app = new EventEmitter() as any;
    app.config = { cluster: {} };
    app.options = {};
    app.ready = (callback: (err?: Error) => void) => callback();
    app.callback = () => (_request: unknown, response: { end(): void }) => response.end();
    app.close = () => {};

    let server: Server | undefined;
    app.once('server', (value: Server) => {
      server = value;
    });
    const messages: any[] = [];
    let messageListener: ((message: string, connection: { resume(): void }) => void) | undefined;
    startAppWorker(
      app,
      { port: 7001, sticky: true, stickyWorkerPort: 7002 },
      {
        workerId: 1,
        send(message) {
          messages.push(message);
        },
        kill() {
          assert.fail('sticky app should not be killed');
        },
        gracefulExit() {},
        on(event, listener) {
          assert.equal(event, 'message');
          messageListener = listener;
        },
      },
    );
    await Promise.resolve();

    assert.deepEqual(
      messages.map((message) => message.action),
      ['realport', 'app-start'],
    );
    assert.ok(server);
    assert.ok(messageListener);
    const resume = vi.fn();
    const connection = { resume };
    messageListener('ignored', connection);
    assert.equal(resume.mock.calls.length, 0);
    messageListener('sticky-session:connection', connection);
    assert.equal(resume.mock.calls.length, 1);
    server.close();
  });

  it('reports reusePort startup to the master', async () => {
    vi.spyOn(os, 'platform').mockReturnValue('linux');
    const app = new EventEmitter() as any;
    app.config = { cluster: { listen: { port: 7001, reusePort: true } } };
    app.options = {};
    app.ready = (callback: (err?: Error) => void) => callback();
    app.callback = () => (_request: unknown, response: { end(): void }) => response.end();
    app.close = () => {};

    let server: Server | undefined;
    app.once('server', (value: Server) => {
      server = value;
    });
    const messages: any[] = [];
    startAppWorker(
      app,
      {},
      {
        workerId: 1,
        send(message) {
          messages.push(message);
        },
        kill() {
          assert.fail('reusePort app should not be killed');
        },
        gracefulExit() {},
        on() {},
      },
    );
    await Promise.resolve();

    assert.equal(messages.at(-1).action, 'app-start');
    assert.equal(messages.at(-1).reusePort, true);
    assert.ok(server);
    server.close();
    vi.restoreAllMocks();
  });

  it('disables reusePort on unsupported platforms', async () => {
    vi.spyOn(os, 'platform').mockReturnValue('darwin');
    const app = new EventEmitter() as any;
    app.config = { cluster: { listen: { port: 7001, reusePort: true } } };
    app.options = {};
    app.ready = (callback: (err?: Error) => void) => callback();
    app.callback = () => (_request: unknown, response: { end(): void }) => response.end();
    app.close = () => {};

    let server: Server | undefined;
    app.once('server', (value: Server) => {
      server = value;
    });
    const messages: any[] = [];
    startAppWorker(
      app,
      {},
      {
        workerId: 1,
        send(message) {
          messages.push(message);
        },
        kill() {
          assert.fail('app should not be killed');
        },
        gracefulExit() {},
        on() {},
      },
    );
    await Promise.resolve();

    assert.equal(messages.at(-1).action, 'app-start');
    assert.equal(messages.at(-1).reusePort, false);
    assert.ok(server);
    server.close();
  });

  it('kills an app when the listen port is invalid', () => {
    const app = new EventEmitter() as any;
    app.config = { cluster: { listen: {} } };
    app.options = {};
    app.ready = (callback: (err?: Error) => void) => callback();
    app.callback = () => (_request: unknown, response: { end(): void }) => response.end();
    app.close = () => {};

    const kill = vi.fn();
    const logger = { error: vi.fn() } as any;
    startAppWorker(
      app,
      {},
      {
        workerId: 1,
        send() {},
        kill,
        gracefulExit() {},
        on() {},
      },
      logger,
    );

    assert.equal(kill.mock.calls.length, 1);
    assert.equal(logger.error.mock.calls.length, 1);
    assert.match(logger.error.mock.calls[0][0], /port should be number/);
  });

  it('closes the app during graceful exit', () => {
    const app = new EventEmitter() as any;
    app.config = { cluster: { listen: { port: 7001 } } };
    app.options = {};
    app.ready = () => {};
    app.close = vi.fn();

    let gracefulExitOptions: { beforeExit(): unknown } | undefined;
    startAppWorker(
      app,
      {},
      {
        workerId: 1,
        send() {},
        kill() {},
        gracefulExit(options) {
          gracefulExitOptions = options as typeof gracefulExitOptions;
        },
        on() {},
      },
    );

    assert.ok(gracefulExitOptions);
    gracefulExitOptions.beforeExit();
    assert.equal(app.close.mock.calls.length, 1);
  });
});
