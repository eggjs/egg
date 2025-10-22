import type { EggPrototype, EggPrototypeLifecycleContext } from '@eggjs/tegg-metadata';
import { ControllerMetaBuilderFactory, ControllerMetadataUtil } from '@eggjs/controller-decorator';
import type { LifecycleHook } from '@eggjs/tegg-lifecycle';

export class EggControllerPrototypeHook implements LifecycleHook<EggPrototypeLifecycleContext, EggPrototype> {
  async postCreate(ctx: EggPrototypeLifecycleContext): Promise<void> {
    const metadata = ControllerMetaBuilderFactory.build(ctx.clazz);
    if (metadata) {
      ControllerMetadataUtil.setControllerMetadata(ctx.clazz, metadata);
    }
  }
}
