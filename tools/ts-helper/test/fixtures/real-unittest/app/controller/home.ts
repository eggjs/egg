import { Controller } from 'egg';

export default class HomeController extends Controller {
  async index() {
    const { ctx, app } = this;
    app.customLog();
    app.myService.test.test();
    ctx.ctxService.test.test();
    ctx.body = 'ok';
  }
}
