import cluster, { type Worker as ClusterProcessWorker } from 'node:cluster';
import { cfork } from 'cfork';
import { sendmessage } from 'sendmessage';
import { graceful as gracefulExit, type Options as gracefulExitOptions } from 'graceful-process';
import { BaseAppWorker, BaseAppUtils } from '../../base/app.js';
import { terminate } from '../../../terminate.js';
import type { MessageBody } from '../../../messenger.js';

export class AppProcessWorker extends BaseAppWorker<ClusterProcessWorker> {
  get id() {
    return this.instance.id;
  }

  get workerId() {
    return this.instance.process.pid!;
  }

  get exitedAfterDisconnect() {
    return this.instance.exitedAfterDisconnect;
  }

  get exitCode() {
    return this.instance.process.exitCode!;
  }

  send(message: MessageBody) {
    sendmessage(this.instance, message);
  }

  clean() {
    this.instance.removeAllListeners();
  }

  // static methods use on src/app_worker.ts

  static get workerId() {
    return process.pid;
  }

  static on(event: string, listener: (...args: any[]) => void) {
    process.on(event, listener);
  }

  static send(message: MessageBody) {
    message.senderWorkerId = String(process.pid);
    process.send!(message);
  }

  static kill() {
    process.exitCode = 1;
    process.kill(process.pid);
  }

  static gracefulExit(options: gracefulExitOptions) {
    gracefulExit(options);
  }
}

export class AppProcessUtils extends BaseAppUtils {
  fork() {
    this.startTime = Date.now();
    this.startSuccessCount = 0;

    const args = [ JSON.stringify(this.options) ];
    this.log('[master] start appWorker with args %j (process)', args);
    cfork({
      exec: this.getAppWorkerFile(),
      args,
      silent: false,
      count: this.options.workers,
      // don't refork in local env
      refork: this.isProduction,
      windowsHide: process.platform === 'win32',
    });

    let debugPort = process.debugPort;
    cluster.on('fork', worker => {
      const appWorker = new AppProcessWorker(worker);
      this.emit('worker_forked', appWorker);
      appWorker.disableRefork = true;
      worker.on('message', msg => {
        if (typeof msg === 'string') {
          msg = {
            action: msg,
            data: msg,
          };
        }
        msg.from = 'app';
        this.messenger.send(msg);
      });
      this.log('[master] app_worker#%s:%s start, state: %s, current workers: %j',
        appWorker.id, appWorker.workerId, appWorker.state,
        Object.keys(cluster.workers!));

      // send debug message, due to `brk` scene, send here instead of app_worker.js
      if (this.options.isDebug) {
        debugPort++;
        this.messenger.send({
          to: 'parent',
          from: 'app',
          action: 'debug',
          data: {
            debugPort,
            // keep compatibility, should use workerId instead
            pid: appWorker.workerId,
            workerId: appWorker.workerId,
          },
        });
      }
    });
    cluster.on('disconnect', worker => {
      const appWorker = new AppProcessWorker(worker);
      this.log('[master] app_worker#%s:%s disconnect, suicide: %s, state: %s, current workers: %j',
        appWorker.id, appWorker.workerId, appWorker.exitedAfterDisconnect, appWorker.state,
        Object.keys(cluster.workers!));
    });
    cluster.on('exit', (worker, code, signal) => {
      const appWorker = new AppProcessWorker(worker);
      this.messenger.send({
        action: 'app-exit',
        data: {
          workerId: appWorker.workerId,
          code,
          signal,
        },
        to: 'master',
        from: 'app',
      });
    });
    return this;
  }

  async kill(timeout: number) {
    await Promise.all(Object.keys(cluster.workers!).map(id => {
      const worker = cluster.workers![id]!;
      Reflect.set(worker, 'disableRefork', true);
      return terminate(worker.process, timeout);
    }));
  }
}
