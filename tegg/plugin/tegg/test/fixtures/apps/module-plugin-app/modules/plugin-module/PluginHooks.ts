import { EggObjectLifecycleProto, Inject, LoadUnitLifecycleProto } from '@eggjs/tegg';
import type {
  EggObject,
  EggObjectLifeCycleContext,
  LifecycleHook,
  LoadUnit,
  LoadUnitLifecycleContext,
} from '@eggjs/tegg-types';

import { InnerRegistry } from './InnerRegistry.ts';

@LoadUnitLifecycleProto()
export class ModuleLoadUnitHook implements LifecycleHook<LoadUnitLifecycleContext, LoadUnit> {
  @Inject()
  innerRegistry: InnerRegistry;

  async postCreate(_ctx: LoadUnitLifecycleContext, loadUnit: LoadUnit): Promise<void> {
    this.innerRegistry.record(String(loadUnit.name));
  }
}

@EggObjectLifecycleProto()
export class HelloObjectHook implements LifecycleHook<EggObjectLifeCycleContext, EggObject> {
  async postCreate(_ctx: EggObjectLifeCycleContext, eggObject: EggObject): Promise<void> {
    if (eggObject.name !== 'helloService') {
      return;
    }
    (eggObject.obj as any).message = 'from HelloObjectHook';
  }
}
