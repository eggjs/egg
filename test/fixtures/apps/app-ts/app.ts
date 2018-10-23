import { Application, IBoot } from 'egg';
import testExportClass from './lib/export-class';
import testLogger from './lib/logger';

export default class AppBoot implements IBoot {
  private readonly app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  get stages(): string[] {
    const app: any = this.app;
    if (!app.stages) {
      app.stages = [];
    }
    return app.stages;
  }

  configWillLoad() {
    this.stages.push('configWillLoad');
  }

  configDidLoad() {
    testExportClass(this.app);
    testLogger(this.app);
    this.stages.push('configDidLoad');
  }

  async didLoad() {
    this.stages.push('didLoad');
  }

  async willReady() {
    this.stages.push('willReady');
  }

  async didReady() {
    this.stages.push('didReady');
  }

  async serverDidReady() {
    this.stages.push('serverDidReady');
  }

  async beforeClose() {
    this.stages.push('beforeClose');
  }
}
