'use strict';

const http = require('http');
const assert = require('assert');
const cluster = require('cluster-client');
const view = require('../../lib/core/view');
const AppWorkerClient = require('../../lib/core/app_worker_client');
const util = require('../../lib/core/util');
const Singleton = require('../../lib/core/singleton');

const KEYS = Symbol('Application#keys');
const APP_CLIENTS = Symbol('Application#appClients');
const VIEW = Symbol('Application#View');
const LOCALS = Symbol('Application#locals');
const LOCALS_LIST = Symbol('Application#localsList');

module.exports = {

  /**
   * Create egg context
   * @method Application#createContext
   * @param  {Req} req - node native Request object
   * @param  {Res} res - node native Response object
   * @return {Context} context object
   */
  createContext(req, res) {
    const app = this;
    const context = Object.create(app.context);
    const request = context.request = Object.create(app.request);
    const response = context.response = Object.create(app.response);
    context.app = request.app = response.app = app;
    context.req = request.req = response.req = req;
    context.res = request.res = response.res = res;
    request.ctx = response.ctx = context;
    request.response = response;
    response.request = request;
    context.onerror = context.onerror.bind(context);
    context.originalUrl = request.originalUrl = req.url;

    /**
     * Request start time
     * @member {Number} Context#starttime
     */
    context.starttime = Date.now();
    return context;
  },

  /**
   * AppWorkerClient class
   * @member {AppWorkerClient} Application#AppWorkerClient
   */
  AppWorkerClient,

  /**
   * 当前进程实例化的 AppWorkerClient 集合
   * @member {Map} Application#appWorkerClients
   * @private
   */
  get appWorkerClients() {
    if (!this[APP_CLIENTS]) {
      this[APP_CLIENTS] = new Map();
    }
    return this[APP_CLIENTS];
  },

  /**
   * 创建一个 App worker "假"客户端
   * @method Application#createAppWorkerClient
   * @param {String} name 客户端的唯一名字
   * @param {Object} impl - 客户端需要实现的 API
   * @param {Object} options
   *   - {Number|String} responseTimeout - 响应超时间隔，默认为 3s
   * @return {AppWorkerClient} - client
   */
  createAppWorkerClient(name, impl, options) {
    options = options || {};
    options.name = name;
    options.app = this;

    const client = new AppWorkerClient(options);
    Object.assign(client, impl);
    // 直接 ready
    client.ready(true);
    return client;
  },

  /**
   * 创建一个单例并添加到 app/agent 上
   * @method Application#addSingleton
   * @param {String} name 单例的唯一名字
   * @param {Object} create - 单例的创建方法
   */
  addSingleton(name, create) {
    const options = {};
    options.name = name;
    options.create = create;
    options.app = this;
    const singleton = new Singleton(options);
    singleton.init();
  },

  /**
   * 获取密钥
   * @member {String} Application#keys
   */
  get keys() {
    if (!this[KEYS]) {
      if (!this.config.keys) {
        if (this.config.env === 'local' || this.config.env === 'unittest') {
          console.warn('Please set config.keys first, now using mock keys for dev env (%s)',
            this.config.baseDir);
          this.config.keys = 'foo, keys, you need to set your app keys';
        } else {
          throw new Error('Please set config.keys first');
        }
      }

      this[KEYS] = this.config.keys.split(',').map(s => s.trim());
    }
    return this[KEYS];
  },

  /**
   * 获取模板渲染类, 继承于 view 插件提供的 View 基类
   * @member {View} Application#View
   * @private
   */
  get View() {
    if (!this[VIEW]) {
      assert(this[Symbol.for('egg#view')], 'should enable view plugin');
      this[VIEW] = view(this[Symbol.for('egg#view')]);
    }
    return this[VIEW];
  },

  /**
   * 全局的 locals 变量
   * @member {Object} Application#locals
   * @see Context#locals
   */
  get locals() {
    if (!this[LOCALS]) {
      this[LOCALS] = {};
    }
    if (this[LOCALS_LIST] && this[LOCALS_LIST].length) {
      util.assign(this[LOCALS], this[LOCALS_LIST]);
      this[LOCALS_LIST] = null;
    }
    return this[LOCALS];
  },

  set locals(val) {
    if (!this[LOCALS_LIST]) {
      this[LOCALS_LIST] = [];
    }
    this[LOCALS_LIST].push(val);
  },

  /**
   * 创建一个匿名请求的 ctx 实例
   * @param {Request} [req] - 自定义 request 对象数据，会进行最多2级的深 copy，可选参数
   * @return {Context} Application#nonUserContext
   */
  createAnonymousContext(req) {
    const request = {
      headers: {
        'x-forwarded-for': '127.0.0.1',
      },
      query: {},
      querystring: '',
      host: '127.0.0.1',
      hostname: '127.0.0.1',
      protocol: 'http',
      secure: 'false',
      method: 'GET',
      url: '/',
      path: '/',
      socket: {
        remoteAddress: '127.0.0.1',
        remotePort: 7001,
      },
    };
    if (req) {
      for (const key in req) {
        if (key === 'headers' || key === 'query' || key === 'socket') {
          Object.assign(request[key], req[key]);
        } else {
          request[key] = req[key];
        }
      }
    }
    const response = new http.ServerResponse(request);
    return this.createContext(request, response);
  },

  /**
   * 已经处理过的 Helper 类，包含用户 App Helper 的所有函数
   * @member {Helper} Application#Helper
   */
  Helper: class Helper {
    /**
     * Helper class
     * @class Helper
     * @param {Object} ctx - context object, etc: this.ctx
     * @example
     * ```js
     * const helper = new Helper(this);
     * helper.csrfTag();
     * ```
     */
    constructor(ctx) {
      this.ctx = ctx;
      this.app = ctx.app;
    }
  },

  /**
   * Wrap the Client with Leader/Follower Pattern
   *
   * @description almost the same as Agent.cluster API, the only different is that this method create Follower.
   *
   * @see https://github.com/node-modules/cluster-client
   * @method Agent#cluster
   * @param {Function} clientClass - client class function
   * @param {Object} [options]
   *   - {Boolean} [autoGenerate] - whether generate delegate rule automatically, default is true
   *   - {Function} [formatKey] - a method to tranform the subscription info into a string，default is JSON.stringify
   *   - {Object} [transcode|JSON.stringify/parse]
   *     - {Function} encode - custom serialize method
   *     - {Function} decode - custom deserialize method
   *   - {Boolean} [isBroadcast] - whether broadcast subscrption result to all followers or just one, default is true
   *   - {Number} [responseTimeout] - response timeout, default is 3 seconds
   *   - {Number} [maxWaitTime|30000] - leader startup max time, default is 30 seconds
   * @return {ClientWrapper} wrapper
   */
  cluster(clientClass, options) {
    options = options || {};
    // master 启动的时候随机分配的一个端口，保证在一台机器上不冲突
    options.port = this._options.clusterPort;
    // app worker 只能是 follower
    options.isLeader = false;
    options.logger = this.coreLogger;
    return cluster(clientClass, options);
  },

};
