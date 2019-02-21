import { IHelper } from 'egg';

export default {
  test(this: IHelper) {
    this.test2();
  },

  test2(this: IHelper) {
    this.ctx.logger.info(this.ctx.test());
  }
}