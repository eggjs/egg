import { LoadUnitInstanceLifecycleProto } from '@eggjs/tegg';
import type { LifecycleHook, LoadUnitInstance, LoadUnitInstanceLifecycleContext } from '@eggjs/tegg-types';

@LoadUnitInstanceLifecycleProto()
export class FooLoadUnitInstanceHook implements LifecycleHook<LoadUnitInstanceLifecycleContext, LoadUnitInstance> {
  async postCreate(_: LoadUnitInstanceLifecycleContext, loadUnitInstance: LoadUnitInstance): Promise<void> {
    if (loadUnitInstance.name !== 'loadUnitInstanceLifecycleApp') {
      return;
    }
    const proto = loadUnitInstance.loadUnit.getEggPrototype('foo', []);
    const foo = loadUnitInstance.getEggObject('foo', proto[0]);
    (foo.obj as any).count = 66;
  }
}
