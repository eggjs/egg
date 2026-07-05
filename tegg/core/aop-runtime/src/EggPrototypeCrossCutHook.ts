import { CrosscutAdviceFactory, CrosscutInfoUtil } from '@eggjs/aop-decorator';
import { EggPrototypeLifecycleProto, Inject } from '@eggjs/core-decorator';
import type { EggPrototype, EggPrototypeLifecycleContext, LifecycleHook } from '@eggjs/tegg-types';

@EggPrototypeLifecycleProto()
export class EggPrototypeCrossCutHook implements LifecycleHook<EggPrototypeLifecycleContext, EggPrototype> {
  @Inject()
  private readonly crosscutAdviceFactory: CrosscutAdviceFactory;

  async preCreate(ctx: EggPrototypeLifecycleContext): Promise<void> {
    if (CrosscutInfoUtil.isCrosscutAdvice(ctx.clazz)) {
      this.crosscutAdviceFactory.registerCrossAdviceClazz(ctx.clazz);
    }
  }
}
