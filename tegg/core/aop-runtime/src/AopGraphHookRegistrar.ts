import { InnerObjectProto } from '@eggjs/core-decorator';
import { LifecyclePostInject } from '@eggjs/lifecycle';
import { GlobalGraph } from '@eggjs/metadata';

import { crossCutGraphHook } from './CrossCutGraphHook.js';
import { pointCutGraphHook } from './PointCutGraphHook.js';

/**
 * Registers the AOP graph build hooks declaratively. Instantiated with the
 * InnerObjectLoadUnit, which both hosts run AFTER the business GlobalGraph is
 * created and BEFORE build() consumes the hooks — the only valid window.
 */
@InnerObjectProto()
export class AopGraphHookRegistrar {
  @LifecyclePostInject()
  protected registerGraphHooks(): void {
    const globalGraph = GlobalGraph.instance;
    if (!globalGraph) {
      throw new Error(
        '[aop-runtime] GlobalGraph must be created before AopGraphHookRegistrar is instantiated, ' +
          'cross-loadUnit crosscut/pointcut weaving would silently never happen',
      );
    }
    globalGraph.registerBuildHook(crossCutGraphHook);
    globalGraph.registerBuildHook(pointCutGraphHook);
  }
}
