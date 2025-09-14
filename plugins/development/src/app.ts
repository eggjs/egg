import type { ILifecycleBoot, Application } from 'egg';

export default class AppBoot implements ILifecycleBoot {
  #app: Application;

  constructor(app: Application) {
    this.#app = app;
    // if true, then don't need to wait at local development mode
    if (app.config.development.fastReady) {
      process.nextTick(() => this.#app.ready(true));
    }
  }

  async configWillLoad() {
    this.#app.config.coreMiddleware.push('eggLoaderTrace');
  }
}
