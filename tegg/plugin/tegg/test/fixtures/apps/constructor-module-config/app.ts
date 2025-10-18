import { Application } from 'egg';

export default class AppBoot {
  app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  configWillLoad() {
    if (this.app.moduleConfigs?.overwrite?.config) {
      (this.app.moduleConfigs.overwrite.config as Record<string, any>).features.dynamic.bar = 'overwrite foo';
    }
  }
}
