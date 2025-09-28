import { Context } from 'egg';

const extendContext = {
  get ctx(): Context {
    return this as any as Context;
  },

  get isProd(): boolean {
    return this.ctx.app.config.env === 'prod';
  },

  get isAjax(): boolean {
    return this.ctx.get('X-Requested-With') === 'XMLHttpRequest';
  },
};

export default extendContext;
