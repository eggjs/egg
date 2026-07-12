import { ControllerMetaBuilderFactory, ControllerMetadataUtil } from '@eggjs/controller-decorator';
import { EggPrototypeLifecycleProto } from '@eggjs/core-decorator';
import type { LifecycleHook } from '@eggjs/lifecycle';
import type { EggPrototype, EggPrototypeLifecycleContext } from '@eggjs/metadata';

/**
 * Host-agnostic prototype lifecycle proto: build controller metadata from the
 * decorated class when its prototype is created. Defined once here; each host
 * re-exports it into its own scanned eggModule.
 */
@EggPrototypeLifecycleProto()
export class ControllerPrototypeHook implements LifecycleHook<EggPrototypeLifecycleContext, EggPrototype> {
  async postCreate(ctx: EggPrototypeLifecycleContext): Promise<void> {
    const metadata = ControllerMetaBuilderFactory.build(ctx.clazz);
    if (metadata) {
      ControllerMetadataUtil.setControllerMetadata(ctx.clazz, metadata);
    }
  }
}
