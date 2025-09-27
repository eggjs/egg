import { debuglog } from 'node:util';
import workerThreads from 'node:worker_threads';

import { sendmessage } from 'sendmessage';

import type { IMessenger } from './IMessenger.ts';
import type { EggApplicationCore } from '../../egg.ts';
import { BaseMessenger } from './base.ts';

const debug = debuglog('egg/lib/core/messenger/ipc');

/**
 * Communication between app worker and agent worker by IPC channel
 */
export class Messenger extends BaseMessenger implements IMessenger {
  readonly pid: string;
  opids: string[] = [];

  constructor(egg: EggApplicationCore) {
    super(egg);
    this.pid = String(process.pid);
    // pids of agent or app managed by master
    // - retrieve app worker pids when it's an agent worker
    // - retrieve agent worker pids when it's an app worker
    this.on('egg-pids', workerIds => {
      debug('[%s:%s] got egg-pids %j', this.egg.type, this.pid, workerIds);
      this.opids = workerIds.map((workerId: number) => String(workerId));
    });
    this.onMessage = this.onMessage.bind(this);
    if (this.egg.options.mode === 'all-in-one-process') {
      process.on('sendmessage-to-self', this.onMessage);
    } else {
      process.on('message', this.onMessage);
    }
    if (!workerThreads.isMainThread) {
      workerThreads.parentPort!.on('message', this.onMessage);
    }
  }

  /**
   * Send message to all agent and app
   * @param {String} action - message key
   * @param {Object} data - message value
   * @return {Messenger} this
   */
  broadcast(action: string, data?: unknown): Messenger {
    debug('[%s:%s] broadcast %s with %j', this.egg.type, this.pid, action, data);
    this.send(action, data, 'app');
    this.send(action, data, 'agent');
    return this;
  }

  /**
   * send message to the specified process
   * @param {String} workerId - the workerId of the receiver
   * @param {String} action - message key
   * @param {Object} data - message value
   * @return {Messenger} this
   */
  sendTo(workerId: string, action: string, data?: unknown): Messenger {
    debug('[%s:%s] send %s with %j to workerId:%s', this.egg.type, this.pid, action, data, workerId);
    const message = {
      action,
      data,
      /**
       * @deprecated Keep compatible, please use receiverWorkerId instead
       */
      receiverPid: String(workerId),
      receiverWorkerId: String(workerId),
    };
    this.#sendMessage(message);
    return this;
  }

  /**
   * send message to one app worker by random
   * - if it's running in agent, it will send to one of app workers
   * - if it's running in app, it will send to agent
   * @param {String} action - message key
   * @param {Object} data - message value
   * @return {Messenger} this
   */
  sendRandom(action: string, data?: unknown): Messenger {
    if (this.opids.length === 0) {
      debug('[%s:%s] no pids, ignore sendRandom %s with %j', this.egg.type, this.pid, action, data);
      return this;
    }
    const index = Math.floor(Math.random() * this.opids.length);
    const workerId = this.opids[index];
    this.sendTo(workerId, action, data);
    return this;
  }

  /**
   * send message to app
   * @param {String} action - message key
   * @param {Object} data - message value
   * @return {Messenger} this
   */
  sendToApp(action: string, data?: unknown): Messenger {
    debug('[%s:%s] send %s with %j to all app', this.egg.type, this.pid, action, data);
    this.send(action, data, 'app');
    return this;
  }

  /**
   * send message to agent
   * @param {String} action - message key
   * @param {Object} data - message value
   * @return {Messenger} this
   */
  sendToAgent(action: string, data?: unknown): Messenger {
    debug('[%s:%s] send %s with %j to all agent', this.egg.type, this.pid, action, data);
    this.send(action, data, 'agent');
    return this;
  }

  /**
   * @param {String} action - message key
   * @param {Object} data - message value
   * @param {String} to - let master know how to send message
   * @return {Messenger} this
   */
  send(action: string, data: unknown | undefined, to?: string): Messenger {
    debug('send message %s with %j to %s', action, data, to);
    this.#sendMessage({
      action,
      data,
      to,
    });
    return this;
  }

  #sendMessage(message: any) {
    debug('[%s:%s] send message %j, mode: %s', this.egg.type, this.pid, message, this.egg.options.mode);
    if (this.egg.options.mode === 'all-in-one-process') {
      // @ts-expect-error event `sendmessage-to-self` is not typed
      process.emit('sendmessage-to-self', message);
    } else {
      sendmessage(process, message);
    }
  }

  onMessage(message: any) {
    if (typeof message?.action === 'string') {
      debug(
        '[%s:%s] got message %s with %j, receiverWorkerId: %s',
        this.egg.type,
        this.pid,
        message.action,
        message.data,
        message.receiverWorkerId ?? message.receiverPid
      );
      this.emit(message.action, message.data);
    } else {
      if (message?.type === 'Buffer') {
        // {"type":"Buffer","data":[255,153,....]
        debug('[%s:%s] got an invalid message: %s', this.egg.type, this.pid, Buffer.from(message.data));
      } else {
        debug('[%s:%s] got an invalid message %j', this.egg.type, this.pid, message);
      }
    }
  }

  close() {
    process.removeListener('message', this.onMessage);
    this.removeAllListeners();
  }

  /**
   * @function Messenger#on
   * @param {String} action - message key
   * @param {Object} data - message value
   */
}
