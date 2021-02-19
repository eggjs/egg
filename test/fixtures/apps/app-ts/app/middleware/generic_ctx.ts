import { Context } from 'egg';

export interface CustomBody {
  bar: string;
}

export default () => {
  return async (ctx: Context<CustomBody>, next: () => Promise<any>) => {
    ctx.locals.url = ctx.url;
    await next();
    console.log(ctx.body.bar);
  };
}
