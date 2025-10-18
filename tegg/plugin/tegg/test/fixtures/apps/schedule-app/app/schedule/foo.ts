import { Subscription } from 'egg';
import AppService from '../../modules/multi-module-service/AppService.js';

export default class Foo extends Subscription {
  static get schedule() {
    return {
      interval: '1m',
      type: 'all',
    };
  }

  async subscribe() {
    await this.ctx.beginModuleScope(async () => {
      const appService = await this.ctx.getEggObject(AppService);
      await appService.findApp();
      // await this.ctx.app.module.multiModuleService.appService.findApp();
    });
  }
}
