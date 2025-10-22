import { setTimeout as sleep } from 'node:timers/promises';
import { Worker as ThreadWorker, threadId, parentPort, type WorkerOptions } from 'node:worker_threads';

import type { Options as gracefulExitOptions } from 'graceful-process';

import { BaseAppWorker, BaseAppUtils } from '../../base/app.ts';
import type { MessageBody } from '../../../messenger.ts';

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

  // static methods use on src/app_worker.ts

  static get workerId(): number {
    return threadId;
  }

  static on(event: string, listener: (...args: any[]) => void): void {
    parentPort!.on(event, listener);
  }

  static send(message: MessageBody): void {
    message.senderWorkerId = String(threadId);
    parentPort!.postMessage(message);
  }

  static kill(): void {
    process.exit(1);
  }

  static gracefulExit(options: gracefulExitOptions): void {
    process.on('exit', async (code) => {
      if (typeof options.beforeExit === 'function') {
        await options.beforeExit();
      }
      process.exit(code);
    });
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

    const ports = this.options.ports ?? [];
    if (!ports.length) {
      ports.push(this.options.port!);
    }
    this.options.workers = ports.length;
    let i = 0;
    do {
      const options = Object.assign({}, this.options, { port: ports[i] });
      const argv = [JSON.stringify(options)];
      this.#forkSingle(this.getAppWorkerFile(), { argv }, ++i);
    } while (i < ports.length);

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
