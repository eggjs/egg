import { graceful as gracefulExit, type Options as GracefulExitOptions } from 'graceful-process';

import type { MessageBody } from '../utils/messenger.ts';
import type { AppWorkerIO } from './app.ts';

/**
 * Process-backed worker transport shared by the traditional process entries
 * and the egg-bundler worker entry (plain boot or V8 snapshot restore).
 *
 * `node:cluster` is fetched only for the reusePort notification so snapshot
 * construction does not cache the build process's primary/worker flavor.
 */
export function createProcessWorkerIO(): AppWorkerIO {
  return {
    get workerId(): number {
      return process.pid;
    },
    send(message: MessageBody): void {
      message.senderWorkerId = String(process.pid);
      // cluster won't get `listening` event when reusePort is true,
      // use cluster.worker.send() instead
      if (message.action === 'app-start' && message.reusePort) {
        // getBuiltinModule returns the CJS exports (the cluster instance);
        // the TS namespace type lacks the instance members, hence the cast.
        const cluster = process.getBuiltinModule('node:cluster') as unknown as {
          worker?: { send(message: unknown): void };
        };
        cluster.worker!.send(message);
        return;
      }
      process.send!(message);
    },
    on(event: string, listener: (...args: any[]) => void): void {
      process.on(event, listener);
    },
    kill(): void {
      process.exitCode = 1;
      process.kill(process.pid);
    },
    gracefulExit(options: GracefulExitOptions): void {
      gracefulExit(options);
    },
  };
}
