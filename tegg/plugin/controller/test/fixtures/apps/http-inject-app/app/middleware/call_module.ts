import { type Next } from '@eggjs/tegg';
import type { Context } from 'egg';

export async function callModuleCtx(ctx: Context, next: Next) {
  await (ctx.module as any).multiModuleService.appService.findApp('foo');
  await next();
}
