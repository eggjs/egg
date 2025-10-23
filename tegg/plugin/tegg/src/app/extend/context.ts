import type { Context } from 'egg';
import type { EggContext as TEggContext } from '@eggjs/tegg-runtime';
import { TEGG_CONTEXT } from '@eggjs/module-common';
import { type EggProtoImplClass, PrototypeUtil, type QualifierInfo } from '@eggjs/core-decorator';
import type { EggPrototype } from '@eggjs/metadata';

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
    const protoObj = PrototypeUtil.getClazzProto(clazz as EggProtoImplClass);
    if (!protoObj) {
      throw new Error(`can not get proto for clazz ${clazz.name}`);
    }
    const proto = protoObj as EggPrototype;
    const eggObject = await this.app.eggContainerFactory.getOrCreateEggObject(proto, name ?? proto.name);
    return eggObject.obj as T;
  }

  async getEggObjectFromName<T>(this: Context, name: string, qualifiers?: QualifierInfo | QualifierInfo[]): Promise<T> {
    if (qualifiers) {
      qualifiers = Array.isArray(qualifiers) ? qualifiers : [qualifiers];
    }
    const eggObject = await this.app.eggContainerFactory.getOrCreateEggObjectFromName(
      name,
      qualifiers as QualifierInfo[],
    );
    return eggObject.obj as T;
  }
}
