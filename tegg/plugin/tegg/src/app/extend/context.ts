import { type EggProtoImplClass, type QualifierInfo } from '@eggjs/core-decorator';
import { TEGG_CONTEXT } from '@eggjs/module-common';
import type { EggContext as TEggContext } from '@eggjs/tegg-runtime';
import { TeggScope } from '@eggjs/tegg-types';
import type { Context } from 'egg';

import { ctxLifecycleMiddleware } from '../../lib/ctx_lifecycle_middleware.ts';

export default class TEggPluginContext {
  // [TEGG_CONTEXT]: TEggContext | undefined;

  async beginModuleScope(this: Context, func: () => Promise<void>): Promise<void> {
    await ctxLifecycleMiddleware(this, func);
  }

  get teggContext(): TEggContext {
    const ctx = this as unknown as Context;
    if (!ctx[TEGG_CONTEXT]) {
      throw new Error('tegg context have not ready, should call after teggCtxLifecycleMiddleware');
    }
    return ctx[TEGG_CONTEXT] as TEggContext;
  }

  async getEggObject<T>(this: Context, clazz: EggProtoImplClass<T>, name?: string): Promise<T> {
    const app = this.app;
    // Run within this app's scope so proto resolution uses the per-app class→proto
    // map (multi-app safe) and ContextHandler/factories resolve the right app —
    // even when called outside a request (e.g. the tegg-vitest runner).
    return TeggScope.run(app._teggScopeBag, async () => {
      const eggObject = await app.eggContainerFactory.getOrCreateEggObjectFromClazz(clazz as EggProtoImplClass, name);
      return eggObject.obj as T;
    });
  }

  async getEggObjectFromName<T>(this: Context, name: string, qualifiers?: QualifierInfo | QualifierInfo[]): Promise<T> {
    if (qualifiers) {
      qualifiers = Array.isArray(qualifiers) ? qualifiers : [qualifiers];
    }
    const app = this.app;
    return TeggScope.run(app._teggScopeBag, async () => {
      const eggObject = await app.eggContainerFactory.getOrCreateEggObjectFromName(name, qualifiers as QualifierInfo[]);
      return eggObject.obj as T;
    });
  }
}
