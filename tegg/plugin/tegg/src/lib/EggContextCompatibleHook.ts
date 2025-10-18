import { BackgroundTaskHelper, type LifecycleHook, ObjectInitType, PrototypeUtil } from '@eggjs/tegg';
import { EggContainerFactory, type EggContext, type EggContextLifecycleContext } from '@eggjs/tegg-runtime';
import { type EggPrototype } from '@eggjs/tegg-metadata';
import { ROOT_PROTO } from '@eggjs/egg-module-common';

import { ModuleHandler } from './ModuleHandler.ts';

export class EggContextCompatibleHook implements LifecycleHook<EggContextLifecycleContext, EggContext> {
  private readonly moduleHandler: ModuleHandler;
  private requestProtoList: Array<EggPrototype> = [];

  constructor(moduleHandler: ModuleHandler) {
    this.moduleHandler = moduleHandler;
    for (const loadUnitInstance of this.moduleHandler.loadUnitInstances) {
      const iterator = loadUnitInstance.loadUnit.iterateEggPrototype();
      for (const proto of iterator) {
        if (proto.initType === ObjectInitType.CONTEXT) {
          this.requestProtoList.push(proto);
        }
      }
    }
  }

  async preCreate(_: unknown, ctx: EggContext): Promise<void> {
    // root proto added in ctxLifecycleMiddleware
    if (!ctx.get(ROOT_PROTO)) {
      for (const proto of this.requestProtoList) {
        ctx.addProtoToCreate(proto.name, proto);
      }
    } else {
      // Use for ctx.runInBackground.
      // BackgroundTaskHelper should get by sync,
      // or tegg context may be destroyed before background task run.
      // So create it in preCreate.
      const protoObj = PrototypeUtil.getClazzProto(BackgroundTaskHelper);
      await EggContainerFactory.getOrCreateEggObject(protoObj as EggPrototype);
    }
  }

  async postCreate(_: unknown, ctx: EggContext): Promise<void> {
    const rootProto = ctx.get(ROOT_PROTO);
    if (rootProto) {
      // Ensure ContextInitiator be called.
      await EggContainerFactory.getOrCreateEggObject(rootProto as EggPrototype);
    }
  }
}
