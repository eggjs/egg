import { Controller } from 'egg';
import MainService from '../../modules/module-main/MainService.js';

export default class App extends Controller {
  async invokeFoo() {
    const mainService = await this.app.getEggObject<MainService>(MainService);
    // const ret = await this.ctx.app.module.moduleMain.mainService.invokeFoo();
    const ret = await mainService.invokeFoo();
    this.ctx.body = {
      ret,
    };
  }
}
