/**
 * AgentWorkerLoader 类，继承 BaseLoader，实现整个应用的加载机制
 */

'use strict';

const EggLoader = require('egg-core').EggLoader;

/**
 * Agent Worker 进程的 Loader，继承 egg-loader
 * @see https://github.com/eggjs/egg-loader
 */
class AgentWorkerLoader extends EggLoader {

  /**
   * loadPlugin first, then loadConfig
   */
  loadConfig() {
    super.loadPlugin();
    super.loadConfig();
  }

  load() {
    this.loadAgentExtend();
    this.loadCustomAgent();
  }
}

module.exports = AgentWorkerLoader;
