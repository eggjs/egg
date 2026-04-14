import type { Context, Next } from 'egg';

export default function timing() {
  return async (ctx: Context, next: Next): Promise<void> => {
    const start = Date.now();
    await next();
    ctx.set('X-Response-Time', `${Date.now() - start}ms`);
  };
}
