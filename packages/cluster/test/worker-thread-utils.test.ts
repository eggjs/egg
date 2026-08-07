import { strict as assert } from 'node:assert';

import { beforeEach, describe, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  errorOnGracefulMessage: false,
  exitOnGracefulMessage: true,
  nextThreadId: 1,
  workers: [] as Array<{
    postMessage: ReturnType<typeof vi.fn>;
    terminate: ReturnType<typeof vi.fn>;
  }>,
}));

vi.mock('node:worker_threads', async () => {
  const { EventEmitter } = await import('node:events');

  class Worker extends EventEmitter {
    threadId = mocks.nextThreadId++;
    postMessage = vi.fn(() => {
      if (mocks.errorOnGracefulMessage) {
        this.emit('error', new Error('graceful shutdown failed'));
      } else if (mocks.exitOnGracefulMessage) {
        this.emit('exit', 0);
      }
    });
    terminate = vi.fn().mockResolvedValue(0);

    constructor() {
      super();
      mocks.workers.push(this);
    }
  }

  return {
    default: { Worker },
    Worker,
  };
});

import { AgentThreadUtils } from '../src/utils/mode/impl/worker_threads/agent.ts';
import { AppThreadUtils } from '../src/utils/mode/impl/worker_threads/app.ts';
import { WORKER_THREAD_GRACEFUL_EXIT } from '../src/worker_protocol/worker-thread.ts';

describe('test/worker-thread-utils.test.ts', () => {
  const dependencies = {
    isProduction: false,
    log: vi.fn(),
    logger: { error: vi.fn() },
    messenger: { send: vi.fn() },
  };

  beforeEach(() => {
    mocks.errorOnGracefulMessage = false;
    mocks.exitOnGracefulMessage = true;
    mocks.nextThreadId = 1;
    mocks.workers.length = 0;
    vi.clearAllMocks();
  });

  it('lets the agent worker exit gracefully before the timeout', async () => {
    const utils = new AgentThreadUtils({ agentWorkerFile: 'agent.js' } as any, dependencies as any);
    utils.fork();

    await utils.kill(10);

    assert.deepEqual(mocks.workers[0].postMessage.mock.calls, [[WORKER_THREAD_GRACEFUL_EXIT]]);
    assert.equal(mocks.workers[0].terminate.mock.calls.length, 0);
  });

  it('terminates the agent worker after the graceful-exit timeout', async () => {
    mocks.exitOnGracefulMessage = false;
    const utils = new AgentThreadUtils({ agentWorkerFile: 'agent.js' } as any, dependencies as any);
    utils.fork();

    await utils.kill(0);

    assert.deepEqual(mocks.workers[0].postMessage.mock.calls, [[WORKER_THREAD_GRACEFUL_EXIT]]);
    assert.equal(mocks.workers[0].terminate.mock.calls.length, 1);
  });

  it('logs and terminates when the agent worker errors during graceful exit', async () => {
    mocks.errorOnGracefulMessage = true;
    const utils = new AgentThreadUtils({ agentWorkerFile: 'agent.js' } as any, dependencies as any);
    utils.fork();

    await utils.kill(10);

    assert.equal(mocks.workers[0].terminate.mock.calls.length, 1);
    assert.equal(dependencies.logger.error.mock.calls.length, 1);
    assert.match(String(dependencies.logger.error.mock.calls[0].at(-1)), /graceful shutdown failed/);
  });

  it('lets every app worker exit gracefully before the timeout', async () => {
    const utils = new AppThreadUtils(
      { appWorkerFile: 'app.js', port: 7001, reusePort: true, workers: 2 } as any,
      dependencies as any,
    );
    utils.fork();

    await utils.kill(10);

    assert.equal(mocks.workers.length, 2);
    for (const worker of mocks.workers) {
      assert.deepEqual(worker.postMessage.mock.calls, [[WORKER_THREAD_GRACEFUL_EXIT]]);
      assert.equal(worker.terminate.mock.calls.length, 0);
    }
    const shutdownLogs = dependencies.log.mock.calls
      .map(([message]) => message)
      .filter((message) => String(message).includes('gracefully close app worker'));
    assert.deepEqual(shutdownLogs, [
      '[master] gracefully close app worker#1 (worker_threads)',
      '[master] gracefully close app worker#2 (worker_threads)',
    ]);
  });

  it('terminates every app worker after the graceful-exit timeout', async () => {
    mocks.exitOnGracefulMessage = false;
    const utils = new AppThreadUtils(
      { appWorkerFile: 'app.js', port: 7001, reusePort: true, workers: 2 } as any,
      dependencies as any,
    );
    utils.fork();

    await utils.kill(0);

    assert.equal(mocks.workers.length, 2);
    for (const worker of mocks.workers) {
      assert.deepEqual(worker.postMessage.mock.calls, [[WORKER_THREAD_GRACEFUL_EXIT]]);
      assert.equal(worker.terminate.mock.calls.length, 1);
    }
  });

  it('logs and terminates when app workers error during graceful exit', async () => {
    mocks.errorOnGracefulMessage = true;
    const utils = new AppThreadUtils(
      { appWorkerFile: 'app.js', port: 7001, reusePort: true, workers: 2 } as any,
      dependencies as any,
    );
    utils.fork();

    await utils.kill(10);

    assert.equal(dependencies.logger.error.mock.calls.length, 2);
    for (const worker of mocks.workers) {
      assert.equal(worker.terminate.mock.calls.length, 1);
    }
    for (const call of dependencies.logger.error.mock.calls) {
      assert.match(String(call.at(-1)), /graceful shutdown failed/);
    }
  });
});
