import { EggContextLifecycleProto } from '@eggjs/tegg';
import type { EggContext } from '@eggjs/tegg-runtime';
import type { EggContextLifecycleContext, LifecycleHook } from '@eggjs/tegg-types';

@EggContextLifecycleProto()
export class FooEggContextHook implements LifecycleHook<EggContextLifecycleContext, EggContext> {
  async postCreate(_: EggContextLifecycleContext, ctx: EggContext): Promise<void> {
    ctx.set('initialized', 'Y');
  }
}
