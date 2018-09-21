'use strict';

const EggLoader = require('egg-core').EggLoader;

/**
 * App worker process Loader, will load plugins
 * @see https://github.com/eggjs/egg-loader
 */
class AppWorkerLoader extends EggLoader {

  /**
   * loadPlugin first, then loadConfig
   * @since 1.0.0
   */
  loadConfig() {
    this.loadPlugin();
    super.loadConfig();
  }

  /**
   * Load all directories in convention
   * @since 1.0.0
   */
  load() {
    // app > plugin > core
    this.loadApplicationExtend();
    this.loadRequestExtend();
    this.loadResponseExtend();
    this.loadContextExtend();
    this.loadHelperExtend();

    // app > plugin
    this.loadCustomApp();
    // app > plugin
    this.loadService();
    // app > plugin > core
    this.loadMiddleware();
    // app
    this.loadController();
    // app
    this.loadRouter(); // Dependent on controllers
  }

}

module.exports = AppWorkerLoader;
