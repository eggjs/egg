'use strict';

const path = require('path');
const EggApplication = require('./egg');
const AgentWorkerLoader = require('./loader').AgentWorkerLoader;

const AGENT_CLIENTS = Symbol('Agent#agentClients');
const EGG_LOADER = Symbol.for('egg#loader');
const EGG_PATH = Symbol.for('egg#eggPath');

/**
 * Singleton instance in Agent Worker, extend {@link EggApplication}
 * @extends EggApplication
 */
class Agent extends EggApplication {

  /**
   * @constructor
   * @param {Object} options - see {@link EggApplication}
   */
  constructor(options) {
    options = options || {};
    options.type = 'agent';
    super(options);

    this._wrapMessenger();

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

  _wrapMessenger() {
    for (const methodName of [ 'broadcast', 'sendTo', 'sendToApp', 'sendToAgent', 'sendRandom' ]) {
      wrapMethod(methodName, this.messenger, this.coreLogger);
    }

    function wrapMethod(methodName, messenger, logger) {
      const originMethod = messenger[methodName];
      messenger[methodName] = function() {
        logger.warn('agent can\'t call %s before server started', methodName);
        originMethod.apply(this, arguments);
      };
      messenger.once('egg-ready', () => {
        messenger[methodName] = originMethod;
      });
    }
  }

  close() {
    process.removeListener('uncaughtException', this._uncaughtExceptionHandler);
    return super.close();
  }

}

module.exports = Agent;
