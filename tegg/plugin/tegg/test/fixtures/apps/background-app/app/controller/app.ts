import { Controller } from 'egg';
import BackgroundService from '../../modules/multi-module-background/BackgroundService.ts';

export default class App extends Controller {
  async background() {
    const backgroundService = await this.ctx.app.getEggObject(BackgroundService);
    await backgroundService.backgroundAdd();
    this.ctx.status = 200;
    this.ctx.body = 'done';
  }

  async backgroudTimeout() {
    const backgroundService = await this.ctx.app.getEggObject(BackgroundService);
    await backgroundService.backgroundAdd(6000);
    this.ctx.status = 200;
    this.ctx.body = 'done';
  }
}
