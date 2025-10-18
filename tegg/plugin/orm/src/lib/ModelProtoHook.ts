import { type LifecycleHook } from '@eggjs/tegg';
import { type EggPrototype, type EggPrototypeLifecycleContext } from '@eggjs/tegg-metadata';
import { IS_MODEL, ModelMetaBuilder, ModelMetadataUtil } from '@eggjs/tegg-orm-decorator';

import { ModelProtoManager } from './ModelProtoManager.ts';

export class ModelProtoHook implements LifecycleHook<EggPrototypeLifecycleContext, EggPrototype> {
  private readonly modelProtoManager: ModelProtoManager;

  constructor(modelProtoManager: ModelProtoManager) {
    this.modelProtoManager = modelProtoManager;
  }

  async postCreate(ctx: EggPrototypeLifecycleContext, obj: EggPrototype): Promise<void> {
    if (!obj.getMetaData(IS_MODEL)) {
      return;
    }
    const builder = new ModelMetaBuilder(ctx.clazz);
    const metadata = builder.build();
    ModelMetadataUtil.setModelMetadata(ctx.clazz, metadata);
    this.modelProtoManager.addProto(ctx.clazz, obj);
  }
}
