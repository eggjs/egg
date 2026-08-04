import { setTimeout as sleep } from 'node:timers/promises';
import { Worker as ThreadWorker, type WorkerOptions } from 'node:worker_threads';

import type { MessageBody } from '../../../messenger.ts';
import { BaseAppWorker, BaseAppUtils } from '../../base/app.ts';

export class AppThreadWorker extends BaseAppWorker<ThreadWorker> {
  #state = 'none';
  #id: number;

  constructor(instance: ThreadWorker, id: number) {
    super(instance);
    this.#id = id;
  }

  get id(): number {
    return this.#id;
  }

  get workerId(): number {
    return this.instance.threadId;
  }

  get state(): string {
    return this.#state;
  }

  set state(val: string) {
    this.#state = val;
  }

  get exitedAfterDisconnect(): boolean {
    return true;
  }

  get exitCode(): number {
    return 0;
    // return this.instance.exitCode;
  }

  send(message: MessageBody): void {
    this.instance.postMessage(message);
  }

  clean(): void {
    this.instance.removeAllListeners();
  }
}

export class AppThreadUtils extends BaseAppUtils {
  #workers: ThreadWorker[] = [];

  #forkSingle(appPath: string, options: WorkerOptions, id: number): void {
    // start app worker
    const worker = new ThreadWorker(appPath, options);
    this.#workers.push(worker);

    // wrap app worker
    const appWorker = new AppThreadWorker(worker, id);
    this.emit('worker_forked', appWorker);
    appWorker.disableRefork = true;
    worker.on('message', (msg: MessageBody) => {
      if (typeof msg === 'string') {
        msg = {
          action: msg,
          data: msg,
        };
      }
      msg.from = 'app';
      this.messenger.send(msg);
    });
    this.log('[master] app_worker#%s (tid:%s) start', appWorker.id, appWorker.workerId);

    // send debug message, due to `brk` scene, send here instead of app_worker.js
    let debugPort = process.debugPort;
    if (this.options.isDebug) {
      debugPort++;
      this.messenger.send({
        to: 'parent',
        from: 'app',
        action: 'debug',
        data: {
          debugPort,
          pid: appWorker.workerId,
          workerId: appWorker.workerId,
        },
      });
    }

    // handle worker exit
    worker.on('exit', async (code) => {
      appWorker.state = 'dead';
      this.messenger.send({
        action: 'app-exit',
        data: {
          workerId: appWorker.workerId,
          code,
        },
        to: 'master',
        from: 'app',
      });

      // refork app worker
      await sleep(1000);
      this.#forkSingle(appPath, options, id);
    });
  }

  fork(): this {
    this.startTime = Date.now();
    this.startSuccessCount = 0;
    const appWorkerFile = this.options.appWorkerFile ?? this.getAppWorkerFile();

    if (this.options.reusePort) {
      // When reusePort is enabled, all workers share the same port
      // and each worker has its own socket
      if (!this.options.port) {
        throw new Error('options.port must be specified when reusePort is enabled');
      }
      for (let i = 0; i < this.options.workers; i++) {
        const argv = [JSON.stringify(this.options)];
        this.#forkSingle(appWorkerFile, { argv }, i + 1);
      }
    } else {
      // Normal mode: each worker can have a different port
      const ports = this.options.ports ?? [];
      if (!ports.length) {
        ports.push(this.options.port!);
      }
      this.options.workers = ports.length;
      let i = 0;
      do {
        const options = Object.assign({}, this.options, { port: ports[i] });
        const argv = [JSON.stringify(options)];
        this.#forkSingle(appWorkerFile, { argv }, ++i);
      } while (i < ports.length);
    }

    return this;
  }

  async kill(): Promise<void> {
    for (const worker of this.#workers) {
      const id = Reflect.get(worker, 'id');
      this.log(`[master] kill app worker#${id} (worker_threads) by worker.terminate()`);
      worker.removeAllListeners();
      worker.terminate();
    }
  }
}
