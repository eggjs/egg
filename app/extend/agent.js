'use strict';

const cluster = require('cluster-client');
const Singleton = require('../../lib/core/singleton');

// 空的 instrument 返回，用于生产环境，避免每次创建对象
const emptyInstrument = {
  end() {},
};

module.exports = {

  /**
   * 创建一个单例并添加到 app/agent 上
   * @method Agent#addSingleton
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
   * 记录操作的时间
   * @method Agent#instrument
   * @param  {String} event 类型
   * @param  {String} action 具体操作
   * @return {Object} 对象包含 end 方法
   * @example
   * ```js
   * const ins = agent.instrument('http', `${method} ${url}`);
   * // doing
   * ins.end();
   * ```
   */
  instrument(event, action) {
    if (this.config.env !== 'local') {
      return emptyInstrument;
    }
    const payload = {
      start: Date.now(),
      agent: this,
      event,
      action,
    };

    return {
      end() {
        const start = payload.start;
        const duration = Date.now() - start;
        payload.agent.logger.info(`[${payload.event}] ${payload.action} ${duration}ms`);
      },
    };
  },

  /**
   * Wrap the Client with Leader/Follower Pattern
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
   * @return {ClientWrapper} wrapper
   */
  cluster(clientClass, options) {
    options = options || {};
    // master will find a free port as the clusterPort
    options.port = this._options.clusterPort;
    // agent will always be the leader
    options.isLeader = true;
    options.logger = this.coreLogger;
    return cluster(clientClass, options);
  },
};
