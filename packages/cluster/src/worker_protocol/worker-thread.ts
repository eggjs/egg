import { parentPort, threadId } from 'node:worker_threads';

import type { Options as GracefulExitOptions } from 'graceful-process';

import type { MessageBody } from '../utils/messenger.ts';
import type { AppWorkerIO } from './app.ts';

export const WORKER_THREAD_GRACEFUL_EXIT = '@eggjs/cluster:graceful-exit';

/**
 * Worker-thread-backed transport shared by the standard worker entries and
 * generated bundle entries.
 */
export function createWorkerThreadIO(): AppWorkerIO {
  const port = parentPort;
  if (!port) {
    throw new Error('createWorkerThreadIO() must be called inside a worker thread');
  }

  return {
    workerId: threadId,
    send(message: MessageBody): void {
      message.senderWorkerId = String(threadId);
      port.postMessage(message);
    },
    on(event: string, listener: (...args: any[]) => void): void {
      port.on(event, listener);
    },
    kill(): void {
      // In a worker thread, process.exit() terminates only the current thread.
      process.exit(1);
    },
    gracefulExit(options: GracefulExitOptions): void {
      const { beforeExit } = options;
      let closing = false;
      port.on('message', async (message: unknown) => {
        if (message !== WORKER_THREAD_GRACEFUL_EXIT || closing) return;
        closing = true;
        try {
          if (typeof beforeExit === 'function') {
            await beforeExit();
          }
          process.exit(0);
        } catch (err) {
          options.logger?.error('[worker_thread] graceful exit failed: %s', err);
          process.exit(1);
        }
      });
    },
  };
}
