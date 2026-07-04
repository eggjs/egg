import { EggPrototypeCreatorFactory, EggPrototypeFactory } from '@eggjs/metadata';
import { Inject, LoadUnitLifecycleProto, SingletonProto } from '@eggjs/tegg';
import type { LifecycleHook, LoadUnit, LoadUnitLifecycleContext } from '@eggjs/tegg-types';

import { Foo } from './Foo.ts';

@LoadUnitLifecycleProto()
export class FooLoadUnitHook implements LifecycleHook<LoadUnitLifecycleContext, LoadUnit> {
  @Inject()
  foo: Foo;

  async preCreate(_: LoadUnitLifecycleContext, loadUnit: LoadUnit): Promise<void> {
    if (loadUnit.name !== 'loadUnitLifecycleApp') {
      return;
    }
    const fooName = this.foo.getName();
    class DynamicBar {
      getName() {
        return 'dynamic bar name|' + fooName;
      }
    }
    SingletonProto()(DynamicBar);
    const protos = await EggPrototypeCreatorFactory.createProto(DynamicBar, loadUnit);
    for (const proto of protos) {
      EggPrototypeFactory.instance.registerPrototype(proto, loadUnit);
    }
  }
}
