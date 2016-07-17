'use strict';

const assert = require('assert');
const ms = require('humanize-ms');
const Base = require('sdk-base');

const MAX_VALUE = Math.pow(2, 31) - 10;
const PROCESS_ID = String(process.pid);

const defaultOptions = {
  responseTimeout: '5s',
};

/**
 * Node 多进程模型下，共享中间件连接的通用解决方案，该类在 worker 进程中被实例化
 */
class AppWorkerClient extends Base {

  /**
   * @constructor
   * @param {Object} options
   *  - {String} name - 确保唯一的名字
   *  - {Application} app - application 实例
   *  - {Number} responseTimeout - 请求超时时长，默认 5s
   */
  constructor(options) {
    assert(options && options.name, '[egg:worker] AppWorkerClient#constructor options.name is required');
    assert(options.app, '[egg:worker] AppWorkerClient#constructor options.app is required');

    super();

    // hsf 服务依赖肯定会比较多的，设置为 100 个
    this.setMaxListeners(100);

    this.options = {};
    Object.assign(this.options, defaultOptions, options);
    this.options.responseTimeout = ms(this.options.responseTimeout);

    const app = options.app;
    this.messenger = app.messenger;
    this.logger = app.loggers.coreLogger;

    // 缓存订阅信息
    this._subscriptions = new Map();
    // 缓存接口调用信息
    this._invokes = new Map();
    this._opaque = 0;

    /**
     * 命令集合
     * @member {Object} AppWorkerClient#commands
     * @private
     */
    this.commands = {
      invoke: `${this.name}_invoke_request`,
      sub: `${this.name}_subscribe_request`,
    };

    // 禁止 AppWorkerClient 重名，以免事件互相干扰
    // 同时保证一个进程中同类型的 WorkerClient 最多只实例化一个
    assert(!app.appWorkerClients.has(this.name),
      `There is already a AppWorkerClient named "${this.name}", pid: ${process.pid}.`);
    app.appWorkerClients.set(this.name, this);

    // 监听 agent worker 进程重启事件
    this.messenger.on('agent-start', this._onAgentWorkerRestart.bind(this));
    // 监听 agent worker 调用返回事件
    this.messenger.on(`${this.name}_invoke_response`, this._onInvokeResponse.bind(this));
    // 监听 agent worker 订阅数据变化事件
    this.messenger.on(`${this.name}_subscribe_changed`, this._onSubscribeChanged.bind(this));

    this.logger.info('[egg:worker] create an AppWorkerClient for "%s"', this.name);
    // 子类需要自己实现客户端 ready 的逻辑
    // this.ready(true);
  }

  /**
   * 标准事件列表，供参考
   * @member {Array}
   * @private
   */
  get publicEvents() {
    return [
      // agent worker 进程重启时触发
      'agent_restart',
      // 异常时触发
      'error',
    ];
  }

  /**
   * 唯一的名字，同 options.name
   * @member {String}
   */
  get name() {
    return this.options.name;
  }

  /**
   * 当前进程号
   * @member {String}
   */
  get pid() {
    return PROCESS_ID;
  }

  /**
   * 获取下一个 opaque 来唯一标识一次接口调用
   * @return {Number} 返回下一个 opaque
   * @private
   */
  _getNextOpaque() {
    if (this._opaque >= MAX_VALUE) {
      this._opaque = 0;
    }
    return this._opaque++;
  }

  /**
   * 调用 agent worker 中实际客户端的某方法
   * @param {String} method - 方法名
   * @param {Array} args - 参数列表
   * @param {Object} options - 其他参数
   * @return {Promise} 返回一个 Promise
   */
  _invoke(method, args, options) {
    options = options || {};
    return new Promise((resolve, reject) => {
      const opaque = this._getNextOpaque();
      const oneway = !!options.oneway;
      const requestObj = {
        opaque,
        method,
        args: args || [],
        pid: this.pid,
        oneway,
      };

      // 通过 rpc 通道转发给 agent worker
      this._sendToAgent(this.commands.invoke, requestObj);

      // 如果是单向的调用，直接返回
      if (oneway) {
        resolve();
        return;
      }

      requestObj.resolve = resolve;
      requestObj.reject = reject;

      // 超时机制
      requestObj.timer = setTimeout(() => {
        const err = new Error(`Agent worker no response in ${this.options.responseTimeout}ms, AppWorkerClient:${this.name} invoke ${method} with req#${opaque}`);
        err.name = 'AgentWorkerRequestTimeoutError';
        reject(err);

        // 抛异常事件，用于统计异常等用处
        this.error(err);

        // 清理调用记录
        this._invokes.delete(opaque);
      }, this.options.responseTimeout);

      // 保存调用记录
      this._invokes.set(opaque, requestObj);
    });
  }

  /**
   * 调用 agent worker 中实际客户端的某方法
   * @param {String} method - 方法名
   * @param {Array} args - 参数列表
   * @param {Object} options - 其他参数
   */
  _invokeOneway(method, args, options) {
    options = options || {};
    options.oneway = true;
    this._invoke(method, args, options);
  }

  /**
   * EventEmitter.on 的别名，主要用于子类覆盖 on 方法的场景使用
   * @param {String} event - 事件名
   * @param {Function} listener - 回调函数
   * @return {AppWorkerClient} this
   * @private
   */
  _on(event, listener) {
    return super.on(event, listener);
  }

  /**
   * EventEmitter.once 的别名，主要用于子类覆盖 once 方法的场景使用
   * @param {String} event - 事件名
   * @param {Function} listener - 回调函数
   * @return {AppWorkerClient} this
   * @private
   */
  _once(event, listener) {
    return super.once(event, listener);
  }

  /**
   * EventEmitter.removeListener 的别名，主要用于子类覆盖 removeListener 方法的场景使用
   * @param {String} event - 事件名
   * @param {Function} listener - 回调函数
   * @return {AppWorkerClient} this
   * @private
   */
  _removeListener(event, listener) {
    return super.removeListener(event, listener);
  }

  /**
   * EventEmitter.removeAllListeners 的别名，主要用于子类覆盖 removeAllListeners 方法的场景使用
   * @param {String} event - 事件名
   * @return {AppWorkerClient} this
   * @private
   */
  _removeAllListeners(event) {
    return super.removeAllListeners(event);
  }

  /**
   * 注册监听（适用于消息类插件：configclient、diamond 等）
   * @param {Object} info - 订阅信息（由子类自己决定结构）
   * @param {Function} listener - 回调函数
   * @return {AppWorkerClient} this
   */
  _subscribe(info, listener) {
    const key = this._formatKey(info);
    this.on(key, listener);
    if (!this._subscriptions.has(key)) {
      const subData = {
        key,
        info,
        pid: this.pid,
      };
      this._subscriptions.set(key, subData);
      this._sendToAgent(this.commands.sub, subData);
    }
    return this;
  }

  /**
   * 取消注册
   * @param {Object} info - 订阅信息（由子类自己决定结构）
   * @param {Function} listener - 回调函数
   * @return {AppWorkerClient} this
   */
  _unSubscribe(info, listener) {
    const key = this._formatKey(info);
    if (this._subscriptions.has(key)) {
      this._subscriptions.delete(key);
      if (listener) {
        this.removeListener(key, listener);
      } else {
        this.removeAllListeners(key);
      }
      // todo: 目前只是 app worker 中取消订阅，agent worker 里任然会收到推送
    }
    return this;
  }

  /**
   * 将订阅信息格式化为一个唯一的键值，例如：info { dataId: 'foo', groupId: 'bar'} => `foo@bar`
   * @param {Object} info - 订阅信息（由子类自己决定结构）
   * @return {String} key
   * @private
   */
  _formatKey(info) {
    return JSON.stringify(info);
  }

  /**
   * 发送 message 给 AgentWorker
   * @param  {String} action 消息动作唯一标识
   * @param  {Object} data 广播的数据。
   * @return {AppWorkerClient} this
   */
  _sendToAgent(action, data) {
    this.messenger.broadcast(action, data);
    this.logger.info('[egg:worker] [%s] send a "%s" action to agent with data: %j', this.name, action, data);
    return this;
  }

  /**
   * @param {Error} err - 异常对象
   */
  error(err) {
    this.emit('error', err);
  }

  /**
   * agent worker 重启逻辑
   * @private
   */
  _onAgentWorkerRestart() {
    // 重新订阅
    for (const key of this._subscriptions.keys()) {
      const info = this._subscriptions.get(key);
      this._sendToAgent(this.commands.sub, info);
    }

    this.logger.info('[egg:worker] [%s] reSubscribe done for "agent restart"', this.name);

    // 暴露给子类监听
    this.emit('agent_restart');
  }

  /**
   * agent worker 返回调用结果时回调
   * @param {Object} response 回调的数据
   * @private
   */
  _onInvokeResponse(response) {
    const invoke = this._invokes.get(response.opaque);
    if (invoke) {
      clearTimeout(invoke.timer);
      this._invokes.delete(response.opaque);

      if (response.success) {
        invoke.resolve(response.data);
        this.logger.info('[egg:worker] [%s] invoke#%s [%s] success with response data: %j',
          this.name, invoke.opaque, invoke.method, response.data);
      } else {
        const err = new Error(response.errorMessage);
        err.stack = response.errorStack;
        invoke.reject(err);
        this.logger.info('[egg:worker] [%s] invoke#%s [%s] failed with error: %s',
          this.name, invoke.opaque, invoke.method, response.errorMessage);
      }
    } else {
      this.logger.warn('[egg:worker] [%s] can not find request handler for invoke with response data: %j. maybe invoke timeout.',
        this.name, response.data);
    }
  }

  /**
   * 订阅的数据发生变化时触发
   * @param {Object} data 变化的数据
   * @private
   */
  _onSubscribeChanged(data) {
    const key = data.key;
    if (this._subscriptions.has(key)) {
      this.logger.info('[egg:worker] [%s] key[%s] value changed, new value: %j', this.name, key, data.value);
      this.emit(key, data.value);
    }
  }
}

module.exports = AppWorkerClient;
