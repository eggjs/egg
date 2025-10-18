import { Context } from 'egg';
import type { EggContext as TEggContext } from '@eggjs/tegg-runtime';
import { TEGG_CONTEXT } from '@eggjs/egg-module-common';
import { type EggProtoImplClass, PrototypeUtil, type QualifierInfo } from '@eggjs/tegg';
import { type EggPrototype } from '@eggjs/tegg-metadata';

import { ctxLifecycleMiddleware } from '../../lib/ctx_lifecycle_middleware.ts';

export default class TEggPluginContext extends Context {
  [TEGG_CONTEXT]: TEggContext | undefined;

  async beginModuleScope(func: () => Promise<void>) {
    await ctxLifecycleMiddleware(this, func);
  }

  get teggContext(): TEggContext {
    if (!this[TEGG_CONTEXT]) {
      throw new Error('tegg context have not ready, should call after teggCtxLifecycleMiddleware');
    }
    return this[TEGG_CONTEXT];
  }

  async getEggObject<T>(clazz: EggProtoImplClass<T>, name?: string) {
    const protoObj = PrototypeUtil.getClazzProto(clazz as EggProtoImplClass);
    if (!protoObj) {
      throw new Error(`can not get proto for clazz ${clazz.name}`);
    }
    const proto = protoObj as EggPrototype;
    const eggObject = await this.app.eggContainerFactory.getOrCreateEggObject(proto, name ?? proto.name);
    return eggObject.obj as T;
  }

  async getEggObjectFromName<T>(name: string, qualifiers?: QualifierInfo | QualifierInfo[]) {
    if (qualifiers) {
      qualifiers = Array.isArray(qualifiers) ? qualifiers : [qualifiers];
    }
    const eggObject = await this.app.eggContainerFactory.getOrCreateEggObjectFromName(
      name,
      qualifiers as QualifierInfo[]
    );
    return eggObject.obj as T;
  }
}

declare module 'egg' {
  interface Context {
    beginModuleScope(func: () => Promise<void>): Promise<void>;
    // getEggObject<T>(clazz: EggProtoImplClass<T>, name?: string, qualifiers?: QualifierInfo | QualifierInfo[]): Promise<T>;
    getEggObject<T>(
      clazz: new (...args: any[]) => T,
      name?: string,
      qualifiers?: QualifierInfo | QualifierInfo[]
    ): Promise<T>;
    getEggObjectFromName<T>(name: string, qualifiers?: QualifierInfo | QualifierInfo[]): Promise<T>;
    teggContext: TEggContext;

    module: EggModule;
  }
}
