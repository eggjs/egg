import { LoadUnitLifecycleProto } from '@eggjs/core-decorator';
import { LifecycleDestroy, LifecyclePostInject } from '@eggjs/lifecycle';
import { GlobalGraph } from '@eggjs/metadata';
import type { LifecycleHook, LoadUnit, LoadUnitLifecycleContext } from '@eggjs/tegg-types';

@LoadUnitLifecycleProto()
export class TestLifecycleHook implements LifecycleHook<LoadUnitLifecycleContext, LoadUnit> {
  static events: string[] = [];

  @LifecyclePostInject()
  registerGraphHook(): void {
    GlobalGraph.instance!.registerBuildHook(() => TestLifecycleHook.events.push('build:graph'));
  }

  async postCreate(_ctx: LoadUnitLifecycleContext, loadUnit: LoadUnit): Promise<void> {
    if (loadUnit.name === 'testUtilInnerLifecycle') TestLifecycleHook.events.push('create:business');
  }

  async preDestroy(_ctx: LoadUnitLifecycleContext, loadUnit: LoadUnit): Promise<void> {
    if (loadUnit.name === 'testUtilInnerLifecycle') TestLifecycleHook.events.push('destroy:business');
  }

  @LifecycleDestroy()
  destroy(): void {
    TestLifecycleHook.events.push('destroy:inner');
  }
}
