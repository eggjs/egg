'use strict';

const debug = require('util').debuglog('egg:util:messenger:ipc');
const is = require('is-type-of');
const workerThreads = require('worker_threads');
const sendmessage = require('sendmessage');
const EventEmitter = require('events');

/**
 * Communication between app worker and agent worker by IPC channel
 */
class Messenger extends EventEmitter {

  constructor() {
    super();
    this.pid = String(process.pid);
    // pids of agent or app managed by master
    // - retrieve app worker pids when it's an agent worker
    // - retrieve agent worker pids when it's an app worker
    this.opids = [];
    this.on('egg-pids', pids => {
      this.opids = pids;
    });
    this._onMessage = this._onMessage.bind(this);
    process.on('message', this._onMessage);
    if (!workerThreads.isMainThread) {
      workerThreads.parentPort.on('message', this._onMessage);
    }
  }

  /**
   * Send message to all agent and app
   * @param {String} action - message key
   * @param {Object} data - message value
   * @return {Messenger} this
   */
  broadcast(action, data) {
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
  sendTo(pid, action, data) {
    debug('[%s] send %s with %j to %s', this.pid, action, data, pid);
    sendmessage(process, {
      action,
      data,
      receiverPid: String(pid),
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
  sendRandom(action, data) {
    /* istanbul ignore if */
    if (!this.opids.length) return this;
    const pid = random(this.opids);
    this.sendTo(String(pid), action, data);
    return this;
  }

  /**
   * send message to app
   * @param {String} action - message key
   * @param {Object} data - message value
   * @return {Messenger} this
   */
  sendToApp(action, data) {
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
  sendToAgent(action, data) {
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
  send(action, data, to) {
    sendmessage(process, {
      action,
      data,
      to,
    });
    return this;
  }

  _onMessage(message) {
    if (message && is.string(message.action)) {
      debug('[%s] got message %s with %j, receiverPid: %s',
        this.pid, message.action, message.data, message.receiverPid);
      this.emit(message.action, message.data);
    }
  }

  close() {
    process.removeListener('message', this._onMessage);
    this.removeAllListeners();
  }

  /**
   * @function Messenger#on
   * @param {String} action - message key
   * @param {Object} data - message value
   */
}

module.exports = Messenger;

function random(arr) {
  const index = Math.floor(Math.random() * arr.length);
  return arr[index];
}
