import { PrototypeUtil } from '@eggjs/core-decorator';
import { TeggScope } from '@eggjs/tegg-types';
import type { EggProtoImplClass, LifecycleHook, LoadUnit, LoadUnitLifecycleContext } from '@eggjs/tegg-types';

const MULTI_INSTANCE_CLAZZ_SET_SLOT = Symbol('tegg:metadata:multiInstanceClazzSet');

export class LoadUnitMultiInstanceProtoHook implements LifecycleHook<LoadUnitLifecycleContext, LoadUnit> {
  // Per-app set: closing one app must not clear another concurrent app's set.
  static get multiInstanceClazzSet(): Set<EggProtoImplClass> {
    return TeggScope.resolve(
      MULTI_INSTANCE_CLAZZ_SET_SLOT,
      () => new Set<EggProtoImplClass>(),
      'LoadUnitMultiInstanceProtoHook.multiInstanceClazzSet',
    );
  }

  static setAllClassList(clazzList: readonly EggProtoImplClass[]): void {
    for (const clazz of clazzList) {
      if (PrototypeUtil.isEggMultiInstancePrototype(clazz)) {
        this.multiInstanceClazzSet.add(clazz);
      }
    }
  }

  static clear(): void {
    this.multiInstanceClazzSet.clear();
  }

  async preCreate(): Promise<void> {
    // ...
  }
}
