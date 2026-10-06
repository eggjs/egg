import { AopContextAdviceRegistry } from '@eggjs/aop-runtime';
import { EggContextLifecycleProto, Inject } from '@eggjs/core-decorator';
import type { LifecycleHook } from '@eggjs/lifecycle';
import { ROOT_PROTO } from '@eggjs/module-common';
import type { EggContext, EggContextLifecycleContext } from '@eggjs/tegg-runtime';

@EggContextLifecycleProto()
export class AopContextHook implements LifecycleHook<EggContextLifecycleContext, EggContext> {
  @Inject()
  private readonly aopContextAdviceRegistry: AopContextAdviceRegistry;

  async preCreate(_: unknown, ctx: EggContext): Promise<void> {
    // compatible with egg controller
    // add context aspect to ctx
    if (!ctx.get(ROOT_PROTO)) {
      for (const proto of this.aopContextAdviceRegistry.getRequestProtos()) {
        ctx.addProtoToCreate(proto.name, proto.proto);
      }
    }
  }
}
