import { EggPrototypeCreatorFactory, EggPrototypeFactory } from '@eggjs/metadata';
import { Inject, LifecycleDestroy, LoadUnitLifecycleProto, SingletonProto } from '@eggjs/tegg';
import type { LifecycleHook, LoadUnit, LoadUnitLifecycleContext } from '@eggjs/tegg-types';

import { Foo } from './Foo.ts';

@LoadUnitLifecycleProto()
export class FooLoadUnitHook implements LifecycleHook<LoadUnitLifecycleContext, LoadUnit> {
  static events: string[] = [];

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

  async preDestroy(_: LoadUnitLifecycleContext, loadUnit: LoadUnit): Promise<void> {
    if (loadUnit.name === 'loadUnitLifecycleApp') {
      FooLoadUnitHook.events.push('business-load-unit-destroy');
    }
  }

  @LifecycleDestroy()
  destroy(): void {
    FooLoadUnitHook.events.push('inner-hook-destroy');
  }
}
