'use strict';

const AppWorkerClient = require('../../lib/core/app_worker_client');

const APP_CLIENTS = Symbol('Application#appClients');

module.exports = {

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


};
