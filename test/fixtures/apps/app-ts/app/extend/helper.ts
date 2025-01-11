// import { IHelper } from 'egg';
import { IHelper } from '../../../../../../src/index.js';

export default {
  test(this: IHelper) {
    (this as any).test2();
  },

  test2(this: IHelper) {
    this.ctx.logger.info('foo');
  }
}
