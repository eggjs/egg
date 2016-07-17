/**
 * AgentWorkerLoader 类，继承 BaseLoader，实现整个应用的加载机制
 */

'use strict';

const path = require('path');
const BaseLoader = require('egg-loader');

/**
 * Agent Worker 进程的 Loader，继承 egg-loader
 * @see https://github.com/eggjs/egg-loader
 */
class AgentWorkerLoader extends BaseLoader {

  constructor(options) {
    options.eggPath = path.join(__dirname, '../../..');
    super(options);
  }

  /**
   * loadPlugin first, then loadConfig
   */
  loadConfig() {
    super.loadPlugin();
    super.loadConfig();
  }
}

module.exports = AgentWorkerLoader;
