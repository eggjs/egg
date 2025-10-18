import { ROOT_PROTO, TEGG_CONTEXT } from '@eggjs/egg-module-common';
import type { Context, Next } from 'egg';
import { type EggContextLifecycleContext } from '@eggjs/tegg-runtime';

import { EggContextImpl } from './EggContextImpl.ts';

export async function ctxLifecycleMiddleware(ctx: Context, next: Next) {
  // should not recreate teggContext
  if (ctx[TEGG_CONTEXT]) {
    await next();
    return;
  }

  const lifecycleCtx: EggContextLifecycleContext = {};
  const teggCtx = new EggContextImpl(ctx);
  // rootProto is set by tegg-controller-plugin global middleware(teggRootProto)
  // is used in EggControllerHook
  const rootProto = ctx[ROOT_PROTO];
  if (rootProto) {
    teggCtx.set(ROOT_PROTO, rootProto);
  }

  if (teggCtx.init) {
    await teggCtx.init(lifecycleCtx);
  }
  try {
    await next();
  } finally {
    if (teggCtx.destroy) {
      teggCtx.destroy(lifecycleCtx).catch(e => {
        e.message = `[tegg/ctxLifecycleMiddleware] destroy tegg ctx failed: ${e.message}`;
        ctx.logger.error(e);
      });
    }
  }
}
