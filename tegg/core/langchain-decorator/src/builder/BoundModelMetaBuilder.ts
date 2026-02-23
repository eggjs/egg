import type { EggProtoImplClass } from '@eggjs/tegg-types';

import { BoundModelMetadata } from '../model/BoundModelMetadata.ts';
import { BoundModelInfoUtil } from '../util/BoundModelInfoUtil.ts';

export class BoundModelMetaBuilder {
  private readonly clazz: EggProtoImplClass;

  constructor(clazz: EggProtoImplClass) {
    this.clazz = clazz;
  }

  build(): BoundModelMetadata | undefined {
    const metadata = BoundModelInfoUtil.getBoundModelMetadata(this.clazz);
    if (metadata) {
      return new BoundModelMetadata(metadata);
    }
  }

  static create(clazz: EggProtoImplClass): BoundModelMetaBuilder {
    return new BoundModelMetaBuilder(clazz);
  }
}
