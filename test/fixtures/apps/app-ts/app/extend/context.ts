import { Context } from 'egg';

export default {
  test(this: Context) {
    return this.url;
  },
}