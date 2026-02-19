import { MetadataUtil } from '@eggjs/core-decorator';
import type { EggProtoImplClass } from '@eggjs/tegg-types';

import type { IBoundModelMetadata } from '../model/BoundModelMetadata.ts';
import { BOUND_MODEL_METADATA } from '../type/metadataKey.ts';

export class BoundModelInfoUtil {
  static setBoundModelMetadata(metadata: IBoundModelMetadata, clazz: EggProtoImplClass) {
    MetadataUtil.defineMetaData(BOUND_MODEL_METADATA, metadata, clazz);
  }

  static getBoundModelMetadata(clazz: EggProtoImplClass): IBoundModelMetadata | undefined {
    return MetadataUtil.getMetaData(BOUND_MODEL_METADATA, clazz);
  }
}
