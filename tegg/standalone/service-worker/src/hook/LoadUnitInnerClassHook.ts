import { EggProtoImplClass, LifecycleHook } from '@eggjs/tegg';
import { EggPrototypeCreatorFactory, EggPrototypeFactory } from '@eggjs/tegg/helper';
import type { LoadUnit, LoadUnitLifecycleContext } from '@eggjs/tegg/helper';

export class LoadUnitInnerClassHook implements LifecycleHook<LoadUnitLifecycleContext, LoadUnit> {
  private readonly innerClasses: EggProtoImplClass[];

  constructor(innerClasses: EggProtoImplClass[]) {
    this.innerClasses = innerClasses;
  }

  async postCreate(_: LoadUnitLifecycleContext, loadUnit: LoadUnit): Promise<void> {
    if (loadUnit.type === 'StandaloneLoadUnitType') {
      for (const clazz of this.innerClasses) {
        const protos = await EggPrototypeCreatorFactory.createProto(clazz, loadUnit);
        for (const proto of protos) {
          EggPrototypeFactory.instance.registerPrototype(proto, loadUnit);
        }
      }
    }
  }
}
