import { MiddlewareFunc } from '../../../../src/index.js';

export const hello: MiddlewareFunc = async (ctx, next) => {
  ctx.body = 'Hello World!';
  console.log(ctx.app.type, ctx.app.server, ctx.app.ctxStorage.getStore()?.performanceStarttime);
  console.log(ctx.performanceStarttime);
  const res = await ctx.curl('https://eggjs.org');
  console.log(res.status);

  // egg watcher
  // console.log('egg watcher', ctx.app.watcher);
  await next();
};
