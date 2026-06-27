import type { EggContext, EggContextLifecycleContext } from '@eggjs/tegg-runtime';
import { TeggScope } from '@eggjs/tegg-types';
import type { Context, Application } from 'egg';

import { EggContextImpl } from '../../lib/EggContextImpl.ts';

const TEGG_LIFECYCLE_CACHE: Map<EggContext, EggContextLifecycleContext> = new Map();

// Per-app: the "is a mock module context already open?" guard. Kept in a
// TeggScope slot (not a module-global) so concurrent multi-app tests don't block
// each other — each app's guard lives in its own bag.
const HAS_MOCK_MODULE_CONTEXT_SLOT = Symbol('tegg:plugin:hasMockModuleContext');

function getHasMockModuleContext(): boolean {
  return TeggScope.getOr<boolean>(HAS_MOCK_MODULE_CONTEXT_SLOT, () => false, 'hasMockModuleContext') ?? false;
}

function setHasMockModuleContext(value: boolean): void {
  TeggScope.set(HAS_MOCK_MODULE_CONTEXT_SLOT, value);
}

export default class TEggPluginApplicationUnittest {
  async mockModuleContext(this: Application, data?: any): Promise<Context> {
    this.deprecate('app.mockModuleContext is deprecated, use mockModuleContextScope.');
    const doWork = async (): Promise<Context> => {
      if (getHasMockModuleContext()) {
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
      setHasMockModuleContext(true);
      return ctx;
    };
    return TeggScope.runMaybe(this._teggScopeBag, doWork);
  }

  async destroyModuleContext(this: Application, ctx: Context): Promise<void> {
    const doWork = async (): Promise<void> => {
      setHasMockModuleContext(false);
      const teggCtx = ctx.teggContext;
      if (!teggCtx) {
        return;
      }
      const lifecycle = TEGG_LIFECYCLE_CACHE.get(teggCtx);
      if (teggCtx.destroy && lifecycle) {
        await teggCtx.destroy(lifecycle);
      }
    };
    return TeggScope.runMaybe(this._teggScopeBag, doWork);
  }

  async mockModuleContextScope<R = any>(this: Application, fn: (ctx: Context) => Promise<R>, data?: any): Promise<R> {
    const doWork = (): Promise<R> => {
      if (getHasMockModuleContext()) {
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
    };
    // Run within this app's scope so app.module/ctx.module proxy resolution and
    // getEggObject read the correct per-app factories.
    return TeggScope.runMaybe(this._teggScopeBag, doWork);
  }
}
