import { EggPrototypeLifecycleProto } from '@eggjs/tegg';
import type { EggPrototype, EggPrototypeLifecycleContext, LifecycleHook } from '@eggjs/tegg-types';

import { Foo } from './Foo.ts';

@EggPrototypeLifecycleProto()
export class FooEggPrototypeHook implements LifecycleHook<EggPrototypeLifecycleContext, EggPrototype> {
  async postCreate(_: EggPrototypeLifecycleContext, proto: EggPrototype): Promise<void> {
    if (proto.name !== 'FooRunner') {
      return;
    }
    Foo.message = 'class name is ' + proto.className;
  }
}
