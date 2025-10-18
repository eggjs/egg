import { MetadataUtil } from '@eggjs/core-decorator';
import { SCHEDULE_METADATA } from '@eggjs/tegg-types';
import type { EggProtoImplClass } from '@eggjs/tegg-types';

import { ScheduleMetadata } from '../model/index.ts';

export class ScheduleMetadataUtil {
  static setScheduleMetadata(clazz: EggProtoImplClass, metaData: ScheduleMetadata<object>) {
    MetadataUtil.defineMetaData(SCHEDULE_METADATA, metaData, clazz);
  }

  static getScheduleMetadata(clazz: EggProtoImplClass): ScheduleMetadata<object> | undefined {
    return MetadataUtil.getMetaData(SCHEDULE_METADATA, clazz);
  }
}
