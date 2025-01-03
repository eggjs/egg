// import { Context } from 'egg';
import { EggContext } from '../../../../../../src/index.js';

export interface CustomBody {
  bar: string;
}

export default () => {
  // return async (ctx: Context<CustomBody>, next: () => Promise<any>) => {
  return async (ctx: EggContext, next: () => Promise<any>) => {
    ctx.locals.url = ctx.url;
    await next();
    console.log((ctx.body as any).bar);
  };
}
