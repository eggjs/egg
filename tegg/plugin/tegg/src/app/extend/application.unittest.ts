import type { Context, Application } from 'egg';
import type { EggContext, EggContextLifecycleContext } from '@eggjs/tegg-runtime';

import { EggContextImpl } from '../../lib/EggContextImpl.ts';

const TEGG_LIFECYCLE_CACHE: Map<EggContext, EggContextLifecycleContext> = new Map();

let hasMockModuleContext = false;

export default class TEggPluginApplicationUnittest {
  async mockModuleContext(this: Application, data?: any): Promise<Context> {
    this.deprecate('app.mockModuleContext is deprecated, use mockModuleContextScope.');
    if (hasMockModuleContext) {
      throw new Error('should not call mockModuleContext twice.');
    }
    // @ts-expect-error mockContext is not typed
    const ctx = this.mockContext(data) as Context;
    const teggCtx = new EggContextImpl(ctx);
    const lifecycle = {};
    TEGG_LIFECYCLE_CACHE.set(teggCtx, lifecycle);
    if (teggCtx.init) {
      await teggCtx.init(lifecycle);
    }
    hasMockModuleContext = true;
    return ctx;
  }

  async destroyModuleContext(this: Application, ctx: Context): Promise<void> {
    hasMockModuleContext = false;

    const teggCtx = ctx.teggContext;
    if (!teggCtx) {
      return;
    }
    const lifecycle = TEGG_LIFECYCLE_CACHE.get(teggCtx);
    if (teggCtx.destroy && lifecycle) {
      await teggCtx.destroy(lifecycle);
    }
  }

  async mockModuleContextScope<R = any>(fn: (ctx: Context) => Promise<R>, data?: any): Promise<R> {
    if (hasMockModuleContext) {
      throw new Error(
        'mockModuleContextScope can not use with mockModuleContext, should use mockModuleContextScope only.',
      );
    }
    // @ts-expect-error mockContextScope only exists in MockApplication
    return this.mockContextScope(async (ctx: Context) => {
      const teggCtx = new EggContextImpl(ctx);
      const lifecycle = {};
      if (teggCtx.init) {
        await teggCtx.init(lifecycle);
      }
      try {
        return await fn(ctx);
      } finally {
        await teggCtx.destroy(lifecycle);
      }
    }, data);
  }
}
