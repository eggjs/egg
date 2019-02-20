'use strict';

const EggLoader = require('egg-core').EggLoader;

/**
 * Agent worker process loader
 * @see https://github.com/eggjs/egg-loader
 */
class AgentWorkerLoader extends EggLoader {

  /**
   * loadPlugin first, then loadConfig
   */
  loadConfig() {
    this.loadPlugin();
    super.loadConfig();
  }

  load() {
    this.loadAgentExtend();
    this.loadContextExtend();

    this.loadCustomAgent();
  }
}

module.exports = AgentWorkerLoader;
