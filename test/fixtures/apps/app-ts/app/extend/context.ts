import { Context } from '../../../../../../src/index.js';

export default {
  test(this: Context) {
    return this.url;
  },
}
