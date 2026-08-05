import { strict as assert } from 'node:assert';

import { afterEach, beforeEach, describe, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  gracefulExit: vi.fn(),
  parentPort: {
    on: vi.fn(),
    postMessage: vi.fn(),
  } as { on: ReturnType<typeof vi.fn>; postMessage: ReturnType<typeof vi.fn> } | null,
}));

vi.mock('graceful-process', async (importOriginal) => ({
  ...(await importOriginal<typeof import('graceful-process')>()),
  graceful: mocks.gracefulExit,
}));

vi.mock('node:worker_threads', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:worker_threads')>()),
  get parentPort() {
    return mocks.parentPort;
  },
  threadId: 42,
}));

import { createProcessWorkerIO } from '../src/worker_protocol/process.ts';
import { createWorkerThreadIO, WORKER_THREAD_GRACEFUL_EXIT } from '../src/worker_protocol/worker-thread.ts';

describe('test/worker-protocol-io.test.ts', () => {
  const originalSendDescriptor = Object.getOwnPropertyDescriptor(process, 'send');
  const originalExitCode = process.exitCode;

  beforeEach(() => {
    mocks.gracefulExit.mockReset();
    mocks.parentPort = {
      on: vi.fn(),
      postMessage: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = originalExitCode;
    if (originalSendDescriptor) {
      Object.defineProperty(process, 'send', originalSendDescriptor);
    } else {
      Reflect.deleteProperty(process, 'send');
    }
  });

  it('adapts process messaging, events, kill, and graceful exit', () => {
    const send = vi.fn();
    Object.defineProperty(process, 'send', { configurable: true, value: send, writable: true });
    const kill = vi.spyOn(process, 'kill').mockReturnValue(true);
    const io = createProcessWorkerIO();

    assert.equal(io.workerId, process.pid);
    const message = { action: 'agent-start' } as any;
    io.send(message);
    assert.equal(message.senderWorkerId, String(process.pid));
    assert.deepEqual(send.mock.calls, [[message]]);

    const listener = vi.fn();
    io.on('worker-protocol-test', listener);
    (process.emit as (...args: any[]) => boolean)('worker-protocol-test', 'hello');
    process.removeListener('worker-protocol-test', listener);
    assert.deepEqual(listener.mock.calls, [['hello']]);

    io.kill();
    assert.equal(process.exitCode, 1);
    assert.deepEqual(kill.mock.calls, [[process.pid]]);

    const options = { beforeExit: vi.fn() } as any;
    io.gracefulExit(options);
    assert.deepEqual(mocks.gracefulExit.mock.calls, [[options]]);
  });

  it('uses cluster.worker for reusePort startup messages', () => {
    const processSend = vi.fn();
    Object.defineProperty(process, 'send', { configurable: true, value: processSend, writable: true });
    const workerSend = vi.fn();
    vi.spyOn(process, 'getBuiltinModule').mockReturnValue({ worker: { send: workerSend } } as any);
    const io = createProcessWorkerIO();
    const message = { action: 'app-start', reusePort: true } as any;

    io.send(message);

    assert.equal(message.senderWorkerId, String(process.pid));
    assert.deepEqual(workerSend.mock.calls, [[message]]);
    assert.equal(processSend.mock.calls.length, 0);
  });

  it('adapts worker-thread messaging, events, kill, and graceful exit', async () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const io = createWorkerThreadIO();

    assert.equal(io.workerId, 42);
    const message = { action: 'ready' } as any;
    io.send(message);
    assert.equal(message.senderWorkerId, '42');
    assert.deepEqual(mocks.parentPort!.postMessage.mock.calls, [[message]]);

    const listener = vi.fn();
    io.on('message', listener);
    assert.deepEqual(mocks.parentPort!.on.mock.calls, [['message', listener]]);

    io.kill();
    assert.deepEqual(exit.mock.calls, [[1]]);

    const beforeExit = vi.fn().mockResolvedValue(undefined);
    io.gracefulExit({ beforeExit } as any);
    const gracefulListener = mocks.parentPort!.on.mock.calls.at(-1)?.[1] as
      | ((message: unknown) => Promise<void>)
      | undefined;
    assert.ok(gracefulListener);
    await gracefulListener('unrelated-message');
    assert.equal(beforeExit.mock.calls.length, 0);
    await gracefulListener(WORKER_THREAD_GRACEFUL_EXIT);
    assert.equal(beforeExit.mock.calls.length, 1);
    assert.deepEqual(exit.mock.calls, [[1], [0]]);
    await gracefulListener(WORKER_THREAD_GRACEFUL_EXIT);
    assert.equal(beforeExit.mock.calls.length, 1);
  });

  it('exits a worker thread with code 1 when graceful cleanup fails', async () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const logger = { error: vi.fn() };
    const io = createWorkerThreadIO();
    io.gracefulExit({ beforeExit: () => Promise.reject(new Error('close failed')), logger } as any);
    const gracefulListener = mocks.parentPort!.on.mock.calls[0][1] as (message: unknown) => Promise<void>;

    await gracefulListener(WORKER_THREAD_GRACEFUL_EXIT);

    assert.deepEqual(exit.mock.calls, [[1]]);
    assert.equal(logger.error.mock.calls.length, 1);
  });

  it('rejects worker-thread IO outside a worker', () => {
    mocks.parentPort = null;
    assert.throws(() => createWorkerThreadIO(), /must be called inside a worker thread/);
  });
});
