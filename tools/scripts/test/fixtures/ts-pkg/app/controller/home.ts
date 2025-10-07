import { Controller } from 'egg';

export default class AppController extends Controller {
  public index() {
    try {
      throw new Error('some err');
    } catch (err: any) {
      this.ctx.logger.error(err);
      this.ctx.body = {
        msg: err.message,
        stack: err.stack,
      };
    }
  }
}
