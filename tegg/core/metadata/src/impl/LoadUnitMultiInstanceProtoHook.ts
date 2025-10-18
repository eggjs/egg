import { PrototypeUtil } from '@eggjs/core-decorator';
import type { EggProtoImplClass, LifecycleHook, LoadUnit, LoadUnitLifecycleContext } from '@eggjs/tegg-types';

export class LoadUnitMultiInstanceProtoHook implements LifecycleHook<LoadUnitLifecycleContext, LoadUnit> {
  static multiInstanceClazzSet: Set<EggProtoImplClass> = new Set();

  static setAllClassList(clazzList: readonly EggProtoImplClass[]) {
    for (const clazz of clazzList) {
      if (PrototypeUtil.isEggMultiInstancePrototype(clazz)) {
        this.multiInstanceClazzSet.add(clazz);
      }
    }
  }

  static clear() {
    this.multiInstanceClazzSet.clear();
  }

  async preCreate(): Promise<void> {
    // ...
  }
}
