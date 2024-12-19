import { EventEmitter } from 'node:events';
import { debuglog } from 'node:util';
import workerThreads from 'node:worker_threads';
import { sendmessage } from 'sendmessage';
import type { IMessenger } from './IMessenger.js';

const debug = debuglog('egg:lib:core:messenger:ipc');

/**
 * Communication between app worker and agent worker by IPC channel
 */
export class Messenger extends EventEmitter implements IMessenger {
  readonly pid: string;
  opids: string[] = [];

  constructor() {
    super();
    this.pid = String(process.pid);
    // pids of agent or app managed by master
    // - retrieve app worker pids when it's an agent worker
    // - retrieve agent worker pids when it's an app worker
    this.on('egg-pids', pids => {
      this.opids = pids;
    });
    this.onMessage = this.onMessage.bind(this);
    process.on('message', this.onMessage);
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
    debug('[%s] broadcast %s with %j', this.pid, action, data);
    this.send(action, data, 'app');
    this.send(action, data, 'agent');
    return this;
  }

  /**
   * send message to the specified process
   * @param {String} pid - the process id of the receiver
   * @param {String} action - message key
   * @param {Object} data - message value
   * @return {Messenger} this
   */
  sendTo(pid: string, action: string, data?: unknown): Messenger {
    debug('[%s] send %s with %j to %s', this.pid, action, data, pid);
    sendmessage(process, {
      action,
      data,
      /**
       * @deprecated Keep compatible, please use receiverWorkerId instead
       */
      receiverPid: String(pid),
      receiverWorkerId: String(pid),
    });
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
      return this;
    }
    const index = Math.floor(Math.random() * this.opids.length);
    const pid = this.opids[index];
    this.sendTo(String(pid), action, data);
    return this;
  }

  /**
   * send message to app
   * @param {String} action - message key
   * @param {Object} data - message value
   * @return {Messenger} this
   */
  sendToApp(action: string, data?: unknown): Messenger {
    debug('[%s] send %s with %j to all app', this.pid, action, data);
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
    debug('[%s] send %s with %j to all agent', this.pid, action, data);
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
    sendmessage(process, {
      action,
      data,
      to,
    });
    return this;
  }

  onMessage(message: any) {
    if (typeof message?.action === 'string') {
      debug('[%s] got message %s with %j, receiverWorkerId: %s',
        this.pid, message.action, message.data, message.receiverWorkerId ?? message.receiverPid);
      this.emit(message.action, message.data);
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
