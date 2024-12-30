import { EggApplicationLoader } from './EggApplicationLoader.js';

/**
 * App worker process Loader, will load plugins
 * @see https://github.com/eggjs/egg-core/blob/master/src/loader/egg_loader.ts
 */
export class AppWorkerLoader extends EggApplicationLoader {
  /**
   * loadPlugin first, then loadConfig
   * @since 1.0.0
   */
  async loadConfig() {
    await this.loadPlugin();
    await super.loadConfig();
  }

  /**
   * Load all directories in convention
   * @since 1.0.0
   */
  async load() {
    // app > plugin > core
    await this.loadApplicationExtend();
    await this.loadRequestExtend();
    await this.loadResponseExtend();
    await this.loadContextExtend();
    await this.loadHelperExtend();

    await this.loadCustomLoader();

    // app > plugin
    await this.loadCustomApp();
    // app > plugin
    await this.loadService();
    // app > plugin > core
    await this.loadMiddleware();
    // app
    await this.loadController();
    // app
    await this.loadRouter(); // Depend on controllers
  }
}
