import { type Next } from '@eggjs/tegg';
import type { Context } from 'egg';

export function logMwFactory(log: string) {
  return async function logMw(ctx: Context, next: Next) {
    await next();
    ctx.body.log = log;
  };
}
