import { parentPort, threadId } from 'node:worker_threads';

import type { Options as GracefulExitOptions } from 'graceful-process';

import type { MessageBody } from '../utils/messenger.ts';
import type { AppWorkerIO } from './app.ts';

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
      process.on('exit', async (code) => {
        if (typeof beforeExit === 'function') {
          await beforeExit();
        }
        process.exit(code);
      });
    },
  };
}
