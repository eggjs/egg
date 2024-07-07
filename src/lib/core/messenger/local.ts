import { debuglog } from 'node:util';
import EventEmitter from 'node:events';
import type { IMessenger } from './IMessenger.js';
import type { EggApplication } from '../../egg.js';

const debug = debuglog('egg:lib:core:messenger:local');

/**
 * Communication between app worker and agent worker with EventEmitter
 */
export class Messenger extends EventEmitter implements IMessenger {
  readonly pid: string;
  readonly egg: EggApplication;

  constructor(egg: EggApplication) {
    super();
    this.egg = egg;
    this.pid = String(process.pid);
  }

  /**
   * Send message to all agent and app
   * @param {String} action - message key
   * @param {Object} data - message value
   * @return {Messenger} this
   */
  broadcast(action: string, data?: unknown): Messenger {
    debug('[%s] broadcast %s with %j', this.pid, action, data);
    this.send(action, data, 'both');
    return this;
  }

  /**
   * send message to the specified process
   * Notice: in single process mode, it only can send to self process,
   * and it will send to both agent and app's messengers.
   * @param {String} pid - the process id of the receiver
   * @param {String} action - message key
   * @param {Object} data - message value
   * @return {Messenger} this
   */
  sendTo(pid: string, action: string, data?: unknown): Messenger {
    debug('[%s] send %s with %j to %s', this.pid, action, data, pid);
    if (String(pid) !== this.pid) {
      return this;
    }
    this.send(action, data, 'both');
    return this;
  }

  /**
   * send message to one worker by random
   * Notice: in single process mode, we only start one agent worker and one app worker
   * - if it's running in agent, it will send to one of app workers
   * - if it's running in app, it will send to agent
   * @param {String} action - message key
   * @param {Object} data - message value
   * @return {Messenger} this
   */
  sendRandom(action: string, data?: unknown): Messenger {
    debug('[%s] send %s with %j to opposite', this.pid, action, data);
    this.send(action, data, 'opposite');
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
    this.send(action, data, 'application');
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
  send(action: string, data: unknown | undefined, to: string): Messenger {
    // use nextTick to keep it async as IPC messenger
    process.nextTick(() => {
      const { egg } = this;
      let application;
      let agent;
      let opposite;

      if (egg.type === 'application') {
        application = egg;
        agent = egg.agent;
        opposite = agent;
      } else {
        agent = egg;
        application = egg.application;
        opposite = application;
      }
      if (!to) {
        to = egg.type === 'application' ? 'agent' : 'application';
      }

      if (application && application.messenger && (to === 'application' || to === 'both')) {
        application.messenger.onMessage({ action, data });
      }
      if (agent && agent.messenger && (to === 'agent' || to === 'both')) {
        agent.messenger.onMessage({ action, data });
      }
      if (opposite && opposite.messenger && to === 'opposite') {
        opposite.messenger.onMessage({ action, data });
      }
    });

    return this;
  }

  onMessage(message: any) {
    if (typeof message?.action === 'string') {
      debug('[%s] got message %s with %j', this.pid, message.action, message.data);
      this.emit(message.action, message.data);
    }
  }

  close() {
    this.removeAllListeners();
  }

  /**
   * @function Messenger#on
   * @param {String} action - message key
   * @param {Object} data - message value
   */
}
