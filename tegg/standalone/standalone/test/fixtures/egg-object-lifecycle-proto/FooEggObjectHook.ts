import { EggObjectLifecycleProto } from '@eggjs/tegg';
import type { EggObject, EggObjectLifeCycleContext, LifecycleHook } from '@eggjs/tegg-types';

@EggObjectLifecycleProto()
export class FooEggObjectHook implements LifecycleHook<EggObjectLifeCycleContext, EggObject> {
  async postCreate(_: EggObjectLifeCycleContext, eggObject: EggObject): Promise<void> {
    if (eggObject.name !== 'foo') {
      return;
    }
    (eggObject.obj as any).message = 'foo message from FooEggObjectHook';
  }
}
