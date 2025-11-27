import { type Next } from '@eggjs/tegg';
import type { Context } from 'egg';

let index = 0;

export async function countMw(ctx: Context, next: Next) {
  await next();
  if (ctx.body) ctx.body.count = index++;
}
