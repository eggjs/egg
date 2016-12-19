'use strict';

const assert = require('assert');
const is = require('is-type-of');
const Base = require('sdk-base');
const co = require('co');

/**
 * Node 多进程模型下，共享中间件连接的通用解决方案，该类在 agent 进程中被实例化
 * @see https://github.com/eggjs/egg#多进程模型及进程间通讯
 */
class AgentWorkerClient extends Base {

  /**
   * @constructor
   * @param {Object} options
   *  - {Agent} agent:  Agent 对象实例
   *  - {String} name: 唯一的名字，例如：diamond | configclient
   *  - {Object} client: 任务的客户端
   *  - {Function} subscribe: 提供一个统一注册的方法
   */
  constructor(options) {
    assert(options.name, '[egg:agent] AgentWorkerClient#constructor options.name is required');
    assert(options.client, '[egg:agent] AgentWorkerClient#constructor options.client is required');
    assert(options.subscribe, '[egg:agent] AgentWorkerClient#constructor options.subscribe is required');

    super();

    this.options = options;
    const agent = options.agent;
    this.messenger = agent.messenger;
    this.logger = agent.loggers.coreLogger;

    // 禁止 AppWorkerClient 重名，以免事件互相干扰
    // 同时保证一个进程中同类型的 WorkerClient 最多只实例化一个
    assert(!agent.agentWorkerClients.has(this.name),
      `There is already a AgentWorkerClient named "!{this.name}", pid: ${process.pid}.`);
    agent.agentWorkerClients.set(this.name, this);

    // 缓存订阅数据
    this._subscriptions = new Map();

    /**
     * 命令集合
     * @member WorkerClient#commands
     */
    this.commands = {
      sendResponse: `${this.name}_invoke_response`,
      subscribeChanged: `${this.name}_subscribe_changed`,
    };

    // 监听订阅请求事件
    this.messenger.on(`${this.name}_subscribe_request`, this._onSubscribeRequest.bind(this));
    // 监听 API 调用请求事件
    this.messenger.on(`${this.name}_invoke_request`, this._onInvokeRequest.bind(this));

    this.innerClient.ready(this.ready.bind(this, true));

    this.logger.info('[egg:agent] create an AgentWorkerClient for "%s"', this.name);
  }

  /**
   * 唯一的名字，同 options.name
   * @member {String}
   */
  get name() {
    return this.options.name;
  }

  /**
   * 任务的客户端，同 options.client
   * @member {Object}
   */
  get innerClient() {
    return this.options.client;
  }

  /**
   * 发送给指定的进程
   * @param {String} pid 接收者进程 id
   * @param {String} action 消息动作唯一标识
   * @param {data} data 发送的消息数据。
   * @return {AgentWorkerClient} this
   */
  _sendTo(pid, action, data) {
    this.messenger.sendTo(pid, action, data);
    this.logger.info('[egg:agent] [%s] send a "%s" action to worker:%s with data: %j', this.name, action, pid, data);
    return this;
  }

  /**
   * 发送 message，广播
   * @param  {String} action 消息动作唯一标识
   * @param  {Object} data 广播的数据。
   * @return {AgentWorkerClient} this
   */
  _broadcast(action, data) {
    this.messenger.sendToApp(action, data);
    this.logger.info('[egg:agent] [%s] broadcast a "%s" action to all workers with data: %j', this.name, action, data);
    return this;
  }

  /**
   * 当收到订阅请求时的处理
   * @param  {Object} req 请求对象
   * @private
   */
  _onSubscribeRequest(req) {
    const info = req.info;
    const key = req.key;
    const oldData = this._subscriptions.get(key);
    const pid = req.pid;

    // 已存在，无需重新订阅
    if (oldData) {
      // 已经存在的配置，则直接触发一次，定向推送给订阅者本身
      if (oldData.timestamp) {
        this._sendTo(pid, this.commands.subscribeChanged, oldData);
      }
      return;
    }

    const data = {
      key,
      info,
      value: null,
      timestamp: null,
    };

    this.logger.info('[egg:agent:%s] start subscribe %s, info: %j', this.name, key, data);
    this._subscriptions.set(key, data);

    this.options.subscribe(info, this._onSubscribeResult.bind(this, key));
  }

  /**
   * 订阅数据改变以后，广播给 worker
   * @param  {String} key 订阅的键
   * @param  {String} value 变化的值
   * @private
   */
  _onSubscribeResult(key, value) {
    const data = this._subscriptions.get(key);
    data.value = value;
    data.timestamp = Date.now();

    this._broadcast(this.commands.subscribeChanged, data);
  }

  /**
   * 将请求转发给真实的中间件客户端，并把结果通过 messenger 返回给对应 worker
   * @param  {Object} request 请求对象
   * @private
   */
  _onInvokeRequest(request) {
    const that = this;
    const pid = request.pid;
    const oneway = !!request.oneway;
    const response = {
      opaque: request.opaque,
      success: true,
      data: null,
      error: null,
    };

    // 插入回调函数
    request.args = request.args || [];

    this.logger.info('[egg:agent] [%s] receive a request:%s to call method:%s with args:%j from worker:%s',
      this.name, request.opaque, request.method, request.args, request.pid);

    function callback(err, result) {
      if (err) {
        response.success = false;
        // ipc 通道无法直接传送 Error 对象
        response.errorMessage = err.message;
        response.errorStack = err.stack;
      } else {
        response.data = result;
      }
      // 结果直接返回给指定 worker
      that._sendTo(pid, that.commands.sendResponse, response);
    }

    if (!oneway) {
      request.args.push(callback);
    }

    // 执行内置真实客户端的对应的方法
    let method = this.innerClient[request.method];
    // 兼容 generatorFunction
    if (is.generatorFunction(method)) {
      method = co.wrap(method);
    }

    const ret = method.apply(this.innerClient, request.args);

    // 兼容 Promise 方法
    if (!oneway && is.promise(ret)) {
      ret.then(result => {
        callback(null, result);
      }).catch(callback);
    }
  }
}

module.exports = AgentWorkerClient;
