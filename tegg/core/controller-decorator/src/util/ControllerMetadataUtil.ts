import { CONTROLLER_META_DATA } from '@eggjs/tegg-types';
import type { ControllerMetadata, EggProtoImplClass } from '@eggjs/tegg-types';
import { MetadataUtil } from '@eggjs/core-decorator';

import { ControllerMetaBuilderFactory } from '../builder/index.ts';

export class ControllerMetadataUtil {
  static setControllerMetadata(clazz: EggProtoImplClass, metaData: ControllerMetadata) {
    MetadataUtil.defineMetaData(CONTROLLER_META_DATA, metaData, clazz);
  }

  static getControllerMetadata(clazz: EggProtoImplClass): ControllerMetadata | undefined {
    let metadata: ControllerMetadata | undefined = MetadataUtil.getOwnMetaData(CONTROLLER_META_DATA, clazz);
    if (metadata) {
      return metadata;
    }
    metadata = ControllerMetaBuilderFactory.build(clazz);
    if (metadata) {
      ControllerMetadataUtil.setControllerMetadata(clazz, metadata);
    }
    return metadata;
  }
}
