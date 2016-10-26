'use strict';

const path = require('path');
const EggApplication = require('./egg');
const AgentWorkerLoader = require('./loader').AgentWorkerLoader;
const AgentWorkerClient = require('./core/agent_worker_client');

const AGENT_CLIENTS = Symbol('Agent#agentClients');
const EGG_LOADER = Symbol.for('egg#loader');
const EGG_PATH = Symbol.for('egg#eggPath');

/**
 * Agent 对象，由 AgentWorker 实例化，和 {@link Application} 共用继承 {@link EggApplication} 的 API
 * @extends EggApplication
 */
class Agent extends EggApplication {

  /**
   * @constructor
   * @param {Object} options - 同 {@link EggApplication}
   */
  constructor(options) {
    options = options || {};
    options.type = 'agent';
    super(options);

    this.loader.load();

    // 不让 agent 退出
    setInterval(() => {}, 24 * 60 * 60 * 1000);

    this._uncaughtExceptionHandler = this._uncaughtExceptionHandler.bind(this);
    process.on('uncaughtException', this._uncaughtExceptionHandler);
  }

  /**
   * 当前进程实例化的 AgentWorkerClient 集合，只在 mm.app 场景下才有用
   * @private
   */
  get agentWorkerClients() {
    if (!this[AGENT_CLIENTS]) {
      this[AGENT_CLIENTS] = new Map();
    }
    return this[AGENT_CLIENTS];
  }

  /**
   * 启动一个 agent 任务
   * @param {Object} options
   * - {String} name 唯一的名字，例如：diamond | configclient
   * - {Object} client 任务的客户端
   * - {Function} subscribe 提供一个统一注册的方法 `subscribe(info, listener)`
   * - {Function} formatKey 提供一个方法：将订阅信息格式化为一个唯一的键值 `formatKey(info)`
   * @return {AgentWorkerClient} -
   * @example
   * ```
   * // 实际创建一个 configclient，然后启动 agent 任务
   * const client = new Configclient();
   * agent.startAgent({
   *   name: 'configclient',
   *   client: client,
   *   subscribe: function(info, listener) {
   *     client.subscribe(info, listener);
   *   },
   *   formatKey: function(info) {
   *     return info.dataId + '@' + info.groupId;
   *   },
   * })
   * ```
   */
  startAgent(options) {
    options = options || {};
    options.agent = this;

    return new AgentWorkerClient(options);
  }

  _uncaughtExceptionHandler(err) {
    if (!(err instanceof Error)) {
      err = new Error(String(err));
    }
    if (err.name === 'Error') {
      err.name = 'unhandledExceptionError';
    }
    this.coreLogger.error(err);
  }

  get [EGG_LOADER]() {
    return AgentWorkerLoader;
  }

  get [EGG_PATH]() {
    return path.join(__dirname, '..');
  }

  close() {
    process.removeListener('uncaughtException', this._uncaughtExceptionHandler);
    return super.close();
  }

}

module.exports = Agent;
