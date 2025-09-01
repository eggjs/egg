import path from 'node:path';
import { EventEmitter } from 'node:events';
import type { Worker as ClusterProcessWorker } from 'node:cluster';
import type { Worker as ThreadWorker } from 'node:worker_threads';
import type { Logger } from 'egg-logger';
import type { MessageBody, Messenger } from '../../messenger.js';
import type { MasterOptions } from '../../../master.js';
import { getSrcDirname } from '../../../dirname.js';

export abstract class BaseAppWorker<T = ThreadWorker | ClusterProcessWorker> {
  instance: T;

  constructor(instance: T) {
    this.instance = instance;
  }

  abstract get workerId(): number;

  abstract get id(): number;

  get state(): string {
    return Reflect.get(this.instance!, 'state') as string;
  }

  set state(state: string) {
    Reflect.set(this.instance!, 'state', state);
  }

  abstract get exitedAfterDisconnect(): boolean;

  abstract get exitCode(): number;

  get disableRefork(): boolean {
    return Reflect.get(this.instance!, 'disableRefork') as boolean;
  }

  set disableRefork(disableRefork: boolean) {
    Reflect.set(this.instance!, 'disableRefork', disableRefork);
  }

  get isDevReload(): boolean {
    return Reflect.get(this.instance!, 'isDevReload') as boolean;
  }

  set isDevReload(isDevReload: boolean) {
    Reflect.set(this.instance!, 'isDevReload', isDevReload);
  }

  abstract send(data: MessageBody): void;

  clean() {
    throw new Error('BaseAppWorker should implement clean.');
  }

  // static methods use on src/app_worker.ts

  static get workerId(): number {
    throw new Error('BaseAppWorker should implement workerId.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static on(..._args: any[]) {
    throw new Error('BaseAppWorker should implement on.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static send(_message: MessageBody) {
    throw new Error('BaseAgentWorker should implement send.');
  }

  static kill() {
    throw new Error('BaseAppWorker should implement kill.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static gracefulExit(_options: any) {
    throw new Error('BaseAgentWorker should implement gracefulExit.');
  }
}

type LogFun = (msg: any, ...args: any[]) => void;

export abstract class BaseAppUtils extends EventEmitter {
  options: MasterOptions;
  protected messenger: Messenger;
  protected log: LogFun;
  protected logger: Logger;
  protected isProduction: boolean;
  // public attrs
  startTime = 0;
  startSuccessCount = 0;
  isAllWorkerStarted = false;

  constructor(options: MasterOptions, {
    log, logger, messenger, isProduction,
  }: {
    log: LogFun;
    logger: Logger;
    messenger: Messenger;
    isProduction: boolean;
  }) {
    super();
    this.options = options;
    this.log = log;
    this.logger = logger;
    this.messenger = messenger;
    this.isProduction = isProduction;
  }

  getAppWorkerFile() {
    return path.join(getSrcDirname(), 'app_worker.js');
  }

  fork() {
    throw new Error('BaseApp should implement fork.');
  }

  abstract kill(timeout: number): Promise<void>;
}
