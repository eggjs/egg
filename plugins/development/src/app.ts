import type { ILifecycleBoot, EggCore } from '@eggjs/core';

export default class AppBoot implements ILifecycleBoot {
  #app: EggCore;

  constructor(app: EggCore) {
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
