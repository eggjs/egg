import type { MiddlewareFunc } from '../../src/index.js';

export const hello: MiddlewareFunc = async (ctx, next) => {
  console.log('Hello middleware');
  console.log(ctx.app.BaseContextClass);
  console.log(ctx.app.Service);
  console.log(ctx.service);
  console.log(ctx.app.timing);
  console.log(ctx.app.lifecycle);
  console.log(ctx.request.ctx.app.timing);
  console.log(ctx.request.app.timing);
  console.log(ctx.request.response.app.timing);
  console.log(ctx.response.request.app.timing);
  await next();
};
