import type { Application } from 'egg';
import type { EggContext, EggContextLifecycleContext } from '@eggjs/tegg-runtime';
import type { EggProtoImplClass, LifecycleHook } from '@eggjs/tegg';
import { PrototypeUtil, ObjectInitType } from '@eggjs/tegg';
import { AspectInfoUtil } from '@eggjs/aop-decorator';
import { type EggPrototype, TeggError } from '@eggjs/tegg-metadata';
import { ROOT_PROTO } from '@eggjs/egg-module-common';

export interface EggPrototypeWithClazz extends EggPrototype {
  clazz?: EggProtoImplClass;
}

export interface ProtoToCreate {
  name: string;
  proto: EggPrototype;
}

export class AopContextHook implements LifecycleHook<EggContextLifecycleContext, EggContext> {
  private readonly moduleHandler: Application['moduleHandler'];
  private requestProtoList: Array<ProtoToCreate> = [];

  constructor(moduleHandler: Application['moduleHandler']) {
    this.moduleHandler = moduleHandler;
    for (const loadUnitInstance of this.moduleHandler.loadUnitInstances) {
      const iterator = loadUnitInstance.loadUnit.iterateEggPrototype();
      for (const proto of iterator) {
        const protoWithClazz = proto as EggPrototypeWithClazz;
        const clazz = protoWithClazz.clazz;
        if (!clazz) continue;
        const aspects = AspectInfoUtil.getAspectList(clazz);
        for (const aspect of aspects) {
          for (const advice of aspect.adviceList) {
            const adviceProto = PrototypeUtil.getClazzProto(advice.clazz) as EggPrototype | undefined;
            if (!adviceProto) {
              throw TeggError.create(`Aop Advice(${advice.clazz.name}) not found in loadUnits`, 'advice_not_found');
            }
            if (adviceProto.initType === ObjectInitType.CONTEXT) {
              this.requestProtoList.push({
                name: advice.name,
                proto: adviceProto,
              });
            }
          }
        }
      }
    }
  }

  async preCreate(_: unknown, ctx: EggContext): Promise<void> {
    // compatible with egg controller
    // add context aspect to ctx
    if (!ctx.get(ROOT_PROTO)) {
      for (const proto of this.requestProtoList) {
        ctx.addProtoToCreate(proto.name, proto.proto);
      }
    }
  }
}
