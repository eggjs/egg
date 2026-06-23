import type { EggContext, EggContextLifecycleContext } from '@eggjs/tegg-runtime';
import { TeggScope } from '@eggjs/tegg-types';
import type { Context, Application } from 'egg';

import { EggContextImpl } from '../../lib/EggContextImpl.ts';

const TEGG_LIFECYCLE_CACHE: Map<EggContext, EggContextLifecycleContext> = new Map();

let hasMockModuleContext = false;

export default class TEggPluginApplicationUnittest {
  async mockModuleContext(this: Application, data?: any): Promise<Context> {
    this.deprecate('app.mockModuleContext is deprecated, use mockModuleContextScope.');
    if (hasMockModuleContext) {
      throw new Error('should not call mockModuleContext twice.');
    }
    const doWork = async (): Promise<Context> => {
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
    };
    return this._teggScopeBag ? TeggScope.run(this._teggScopeBag, doWork) : doWork();
  }

  async destroyModuleContext(this: Application, ctx: Context): Promise<void> {
    hasMockModuleContext = false;

    const teggCtx = ctx.teggContext;
    if (!teggCtx) {
      return;
    }
    const lifecycle = TEGG_LIFECYCLE_CACHE.get(teggCtx);
    const doWork = async (): Promise<void> => {
      if (teggCtx.destroy && lifecycle) {
        await teggCtx.destroy(lifecycle);
      }
    };
    return this._teggScopeBag ? TeggScope.run(this._teggScopeBag, doWork) : doWork();
  }

  async mockModuleContextScope<R = any>(this: Application, fn: (ctx: Context) => Promise<R>, data?: any): Promise<R> {
    if (hasMockModuleContext) {
      throw new Error(
        'mockModuleContextScope can not use with mockModuleContext, should use mockModuleContextScope only.',
      );
    }
    const doWork = (): Promise<R> => {
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
    };
    // Run within this app's scope so app.module/ctx.module proxy resolution and
    // getEggObject read the correct per-app factories.
    return this._teggScopeBag ? TeggScope.run(this._teggScopeBag, doWork) : doWork();
  }
}
