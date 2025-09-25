import { type ILifecycleBoot, Application } from 'egg';

export default class Boot implements ILifecycleBoot {
  #app: Application;
  constructor(app: Application) {
    this.#app = app;
  }

  configWillLoad() {
    // make sure clusterAppMock position before securities
    const index = this.#app.config.coreMiddleware.indexOf('securities');
    if (index >= 0) {
      this.#app.config.coreMiddleware.splice(index, 0, 'clusterAppMock');
    } else {
      this.#app.config.coreMiddleware.push('clusterAppMock');
    }
  }
}
