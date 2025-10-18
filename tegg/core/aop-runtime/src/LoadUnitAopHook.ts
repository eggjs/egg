import { AspectInfoUtil, AspectMetaBuilder, CrosscutAdviceFactory } from '@eggjs/aop-decorator';
import { PrototypeUtil } from '@eggjs/core-decorator';
import { TeggError } from '@eggjs/tegg-metadata';
import type {
  EggPrototype,
  EggPrototypeWithClazz,
  LifecycleHook,
  LoadUnit,
  LoadUnitLifecycleContext,
} from '@eggjs/tegg-types';

export class LoadUnitAopHook implements LifecycleHook<LoadUnitLifecycleContext, LoadUnit> {
  private readonly crosscutAdviceFactory: CrosscutAdviceFactory;

  constructor(crosscutAdviceFactory: CrosscutAdviceFactory) {
    this.crosscutAdviceFactory = crosscutAdviceFactory;
  }

  async postCreate(_: LoadUnitLifecycleContext, loadUnit: LoadUnit): Promise<void> {
    for (const proto of loadUnit.iterateEggPrototype()) {
      const protoWithClazz = proto as EggPrototypeWithClazz;
      const clazz = protoWithClazz.clazz;
      if (!clazz) continue;

      const builder = new AspectMetaBuilder(clazz, {
        crosscutAdviceFactory: this.crosscutAdviceFactory,
      });
      const aspectList = builder.build();
      AspectInfoUtil.setAspectList(aspectList, clazz);
      for (const aspect of aspectList) {
        for (const advice of aspect.adviceList) {
          const adviceProto = PrototypeUtil.getClazzProto(advice.clazz);
          if (!adviceProto) {
            throw TeggError.create(`Aop Advice(${advice.clazz.name}) not found in loadUnits`, 'advice_not_found');
          }

          proto.injectObjects.push({
            refName: advice.name,
            objName: advice.name,
            qualifiers: [],
            proto: adviceProto as EggPrototype,
          });
        }
      }
    }
  }
}
