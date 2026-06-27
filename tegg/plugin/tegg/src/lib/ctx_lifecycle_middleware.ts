import { ROOT_PROTO, TEGG_CONTEXT } from '@eggjs/module-common';
import { StreamUtil } from '@eggjs/tegg-common-util';
import type { EggContextLifecycleContext } from '@eggjs/tegg-runtime';
import { TeggScope } from '@eggjs/tegg-types';
// @ts-expect-error - no type declarations available
import awaitFirst from 'await-first';
import type { Context, Next } from 'egg';

import { EggContextImpl } from './EggContextImpl.ts';

export async function ctxLifecycleMiddleware(ctx: Context, next: Next): Promise<void> {
  // Propagate this app's per-app factories through the async context of the whole
  // request, so tegg object resolution during next() reads the correct app.
  return TeggScope.run(ctx.app._teggScopeBag, async () => {
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

    async function doDestroy() {
      if (StreamUtil.isStream(ctx.response.body)) {
        try {
          await awaitFirst(ctx.response.body, ['close', 'error']);
        } catch (error) {
          ctx.res.destroy(error as Error);
        }
      }
      try {
        if (teggCtx.destroy) {
          await teggCtx.destroy(lifecycleCtx);
        }
      } catch (e: any) {
        e.message = `[tegg/ctxLifecycleMiddleware] destroy tegg ctx failed: ${e.message}`;
        ctx.logger.error(e);
      }
    }
    try {
      await next();
    } finally {
      doDestroy();
    }
  });
}
