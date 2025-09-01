import path from 'node:path';
import { EventEmitter } from 'node:events';
import type { ChildProcess } from 'node:child_process';
import type { Worker } from 'node:worker_threads';
import type { Logger } from 'egg-logger';
import type { MasterOptions } from '../../../master.js';
import type { MessageBody, Messenger } from '../../messenger.js';
import { getSrcDirname } from '../../../dirname.js';

export abstract class BaseAgentWorker<T = ChildProcess | Worker> {
  instance: T;
  #instanceId: number;
  #instanceStatus: string;

  constructor(instance: T) {
    this.instance = instance;
  }

  abstract get workerId(): number;

  get id() {
    return this.#instanceId;
  }

  set id(id) {
    this.#instanceId = id;
  }

  get status() {
    return this.#instanceStatus;
  }

  set status(status) {
    this.#instanceStatus = status;
  }

  abstract send(message: MessageBody): void;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static send(_message: MessageBody) {
    throw new Error('BaseAgentWorker should implement send.');
  }

  static kill() {
    throw new Error('BaseAgentWorker should implement kill.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static gracefulExit(_options: any) {
    throw new Error('BaseAgentWorker should implement gracefulExit.');
  }
}

type LogFun = (msg: any, ...args: any[]) => void;

export abstract class BaseAgentUtils extends EventEmitter {
  protected options: MasterOptions;
  protected messenger: Messenger;
  protected log: LogFun;
  protected logger: Logger;
  // public attrs
  startTime = 0;

  constructor(options: MasterOptions, { log, logger, messenger }: {
    log: LogFun;
    logger: Logger;
    messenger: Messenger;
  }) {
    super();
    this.options = options;
    this.log = log;
    this.logger = logger;
    this.messenger = messenger;
    // this.instance = null;
  }

  getAgentWorkerFile() {
    return path.join(getSrcDirname(), 'agent_worker.js');
  }

  fork() {
    throw new Error('BaseAgent should implement fork.');
  }

  clean() {
    throw new Error('BaseAgent should implement clean.');
  }

  abstract kill(timeout: number): Promise<void>;
}
