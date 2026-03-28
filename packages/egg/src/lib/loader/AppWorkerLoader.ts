import path from 'node:path';

import { EggApplicationLoader } from './EggApplicationLoader.ts';

/**
 * App worker process Loader, will load plugins
 * @see https://github.com/eggjs/egg-core/blob/master/src/loader/egg_loader.ts
 */
export class AppWorkerLoader extends EggApplicationLoader {
  /**
   * loadPlugin first, then loadConfig
   * @since 1.0.0
   */
  async loadConfig(): Promise<void> {
    await this.loadPlugin();
    await super.loadConfig();
  }

  /**
   * Load all directories in convention
   * @since 1.0.0
   */
  async load(): Promise<void> {
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
    if (this.options.metadataOnly) {
      // Resolve router path to collect metadata, but don't execute it
      this.resolveModule(path.join(this.options.baseDir, 'app/router'));
    } else {
      await this.loadRouter(); // Depend on controllers
    }
  }
}
