import { Context } from '../../../../../../src/index.js';

export default () => {
  return async (ctx: Context, next: () => Promise<any>) => {
    ctx.locals.url = ctx.url;
    await next();
  };
}
