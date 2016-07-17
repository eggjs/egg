'use strict';

const debug = require('debug')('egg:util:messenger');
const is = require('is-type-of');
const sendmessage = require('sendmessage');
const EventEmitter = require('events');

class Messenger extends EventEmitter {
  constructor() {
    super();
    this.pid = String(process.pid);
    // app/agent 对方的进程，app.messenger.opids 就是 agent 的 pid
    this.opids = [];
    this.on('egg-pids', pids => {
      this.opids = pids;
    });
    this._onMessage = this._onMessage.bind(this);
    process.on('message', this._onMessage);
  }

  /**
   * 发送 message，广播
   * @param  {String} action 消息动作唯一标识
   * @param  {Object} data 广播的数据。
   * @return {Messenger} this
   */
  broadcast(action, data) {
    debug('[%s] broadcast %s with %j', this.pid, action, data);
    sendmessage(process, {
      action,
      data,
    });
    this.emit(action, data);
    return this;
  }

  send(action, data) {
    return this.broadcast(action, data);
  }

  /**
   * 发送给指定的进程
   * @param {String} pid 接收者进程 id
   * @param {String} action 消息动作唯一标识
   * @param {data} data 发送的消息数据。
   * @return {Messenger} this
   */
  sendTo(pid, action, data) {
    debug('[%s] send %s with %j to %s', this.pid, action, data, pid);
    sendmessage(process, {
      action,
      data,
      receiverPid: String(pid),
    });
    this.emit(action, data);
    return this;
  }

  /**
   * 随机找一个进程发送
   * - 如果在 app，直接发给 agent
   * - 如果在 agent，会随机挑选一个 app 进程发送
   * @param {String} action 消息动作唯一标识
   * @param {data} data 发送的消息数据。
   * @return {Messenger} this
   */
  sendRandom(action, data) {
    if (!this.opids.length) return this;
    const pid = random(this.opids);
    this.sendTo(String(pid), action, data);
    return this;
  }

  /**
   * 发送消息给所有的 app 进程（agent 和 app 上都可以调用）
   * @param {String} action 消息动作唯一标识
   * @param {data} data 发送的消息数据。
   * @return {Messenger} this
   */
  sendToApp(action, data) {
    debug('[%s] send %s with %j to all app', this.pid, action, data);
    sendmessage(process, {
      action,
      data,
      to: 'app',
    });
    return this;
  }

  /**
   * 发送消息给所有的 agent 进程（agent 和 app 上都可以调用）
   * 在 worker 上调用时和 `send` 方法不同的是，不会同时在调用方触发该事件
   * @param {String} action 消息动作唯一标识
   * @param {data} data 发送的消息数据。
   * @return {Messenger} this
   */
  sendToAgent(action, data) {
    debug('[%s] send %s with %j to all agent', this.pid, action, data);
    sendmessage(process, {
      action,
      data,
      to: 'agent',
    });
    return this;
  }

  /**
   * 处理 message 事件
   * @method Messenger#on
   * @param {Object} message 只处理符合格式的 message
   *  - {String} action
   *  - {Object} data
   * @return {void}
   */
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
}

module.exports = Messenger;

function random(arr) {
  const index = Math.floor(Math.random() * arr.length);
  return arr[index];
}
