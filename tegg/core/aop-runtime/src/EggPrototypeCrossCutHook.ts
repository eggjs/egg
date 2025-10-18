import type { EggPrototype, EggPrototypeLifecycleContext, LifecycleHook } from '@eggjs/tegg-types';
import { CrosscutAdviceFactory, CrosscutInfoUtil } from '@eggjs/aop-decorator';

export class EggPrototypeCrossCutHook implements LifecycleHook<EggPrototypeLifecycleContext, EggPrototype> {
  private readonly crosscutAdviceFactory: CrosscutAdviceFactory;

  constructor(crosscutAdviceFactory: CrosscutAdviceFactory) {
    this.crosscutAdviceFactory = crosscutAdviceFactory;
  }

  async preCreate(ctx: EggPrototypeLifecycleContext): Promise<void> {
    if (CrosscutInfoUtil.isCrosscutAdvice(ctx.clazz)) {
      this.crosscutAdviceFactory.registerCrossAdviceClazz(ctx.clazz);
    }
  }
}
