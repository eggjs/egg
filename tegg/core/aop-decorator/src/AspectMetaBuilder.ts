import type { EggProtoImplClass } from '@eggjs/tegg-types';

import { CrosscutAdviceFactory } from './CrosscutAdviceFactory.ts';
import { Aspect, AspectBuilder } from './model/index.ts';
import { PointcutAdviceInfoUtil } from './util/index.ts';

export class AspectMetaBuilder {
  private readonly clazz: EggProtoImplClass;
  private readonly crosscutAdviceFactory: CrosscutAdviceFactory;

  constructor(
    clazz: EggProtoImplClass,
    options: {
      crosscutAdviceFactory: CrosscutAdviceFactory;
    },
  ) {
    this.clazz = clazz;
    this.crosscutAdviceFactory = options.crosscutAdviceFactory;
  }

  build(): Array<Aspect> {
    const aspectList: Array<Aspect> = [];
    const methods = AspectMetaBuilder.getAllMethods(this.clazz);
    for (const method of methods) {
      const aspect = this.doBuildMethodAspect(method);
      if (aspect) {
        aspectList.push(aspect);
      }
    }
    return aspectList;
  }

  static getAllMethods(clazz: EggProtoImplClass): PropertyKey[] {
    const methodSet = new Set<string>();
    function getMethods(obj: any) {
      if (obj) {
        const propDescs = Object.getOwnPropertyDescriptors(obj);
        for (const [name, desc] of Object.entries(propDescs)) {
          if (desc.value instanceof Function) {
            methodSet.add(name);
          }
        }
        getMethods(Object.getPrototypeOf(obj));
      }
    }

    getMethods(clazz.prototype);

    return Array.from(methodSet);
  }

  private doBuildMethodAspect(method: PropertyKey): Aspect | undefined {
    const crosscutAdviceList = this.crosscutAdviceFactory.getAdvice(this.clazz, method);
    // decorator execute in reverse order
    const pointcutAdviceList = PointcutAdviceInfoUtil.getPointcutAdviceInfoList(this.clazz, method);
    if (!crosscutAdviceList.length && !pointcutAdviceList.length) return;
    const aspectBuilder = new AspectBuilder(this.clazz, method);
    for (const advice of crosscutAdviceList) {
      aspectBuilder.addAdvice(advice);
    }
    for (const advice of pointcutAdviceList) {
      aspectBuilder.addAdvice(advice);
    }
    return aspectBuilder.build();
  }
}
