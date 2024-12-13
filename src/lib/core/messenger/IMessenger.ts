import type { EventEmitter } from 'node:events';

export interface IMessenger extends EventEmitter {
  /**
   * Send message to all agent and app
   * @param {String} action - message key
   * @param {Object} data - message value
   * @return {Messenger} this
   */
  broadcast(action: string, data?: unknown): IMessenger;

  /**
   * send message to the specified process
   * @param {String} pid - the process id of the receiver
   * @param {String} action - message key
   * @param {Object} data - message value
   * @return {Messenger} this
   */
  sendTo(pid: string, action: string, data?: unknown): IMessenger;

  /**
   * send message to one app worker by random
   * - if it's running in agent, it will send to one of app workers
   * - if it's running in app, it will send to agent
   * @param {String} action - message key
   * @param {Object} data - message value
   * @return {Messenger} this
   */
  sendRandom(action: string, data?: unknown): IMessenger;

  /**
   * send message to app
   * @param {String} action - message key
   * @param {Object} data - message value
   * @return {Messenger} this
   */
  sendToApp(action: string, data?: unknown): IMessenger;

  /**
   * send message to agent
   * @param {String} action - message key
   * @param {Object} data - message value
   * @return {Messenger} this
   */
  sendToAgent(action: string, data?: unknown): IMessenger;

  /**
   * @param {String} action - message key
   * @param {Object} data - message value
   * @param {String} to - let master know how to send message
   * @return {Messenger} this
   */
  send(action: string, data: unknown | undefined, to?: string): IMessenger;

  close(): void;

  onMessage(message: any): void;
}
