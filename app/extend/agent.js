'use strict';

const cluster = require('cluster-client');
const Singleton = require('../../lib/core/singleton');

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
