import { Context, type MiddlewareFunc } from '../../src/index.ts';

class CustomContext extends Context {
  // Add your custom properties and methods here
  get hello() {
    return 'world';
  }
}

export const middleware: MiddlewareFunc<CustomContext> = async (ctx, next) => {
  console.log('middleware start, %s', ctx.hello, ctx.writable);
  await next();
  console.log('middleware end');
};
