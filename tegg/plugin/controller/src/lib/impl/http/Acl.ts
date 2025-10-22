import type { Next, HTTPControllerMeta, HTTPMethodMeta, MiddlewareFunc } from '@eggjs/controller-decorator';
import type { Context } from 'egg';

export function aclMiddlewareFactory(
  controllerMeta: HTTPControllerMeta,
  methodMeta: HTTPMethodMeta
): MiddlewareFunc | undefined {
  if (!controllerMeta.hasMethodAcl(methodMeta)) {
    return;
  }
  const code = controllerMeta.getMethodAcl(methodMeta);
  return async function aclMiddleware(ctx: Context, next: Next) {
    try {
      // @ts-expect-error ctx.acl is implemented in extend/context.ts on top level plugin, framework or app
      await ctx.acl(code);
    } catch (e: any) {
      const { redirectUrl, status } = e.data || {};
      if (!redirectUrl) {
        throw e;
      }
      if (ctx.acceptJSON) {
        ctx.body = {
          target: redirectUrl,
          stat: 'deny',
        };
        return;
      }
      if (status) {
        ctx.realStatus = status;
      }
      ctx.redirect(redirectUrl);
      return;
    }
    return next();
  };
}
