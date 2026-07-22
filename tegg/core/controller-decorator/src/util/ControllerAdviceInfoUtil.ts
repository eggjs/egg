import { MetadataUtil } from '@eggjs/core-decorator';
import { IS_ADVICE } from '@eggjs/tegg-types';
import type { EggProtoImplClass, IAdvice } from '@eggjs/tegg-types';

export class ControllerAdviceInfoUtil {
  static isAdvice(clazz: EggProtoImplClass<IAdvice>): boolean {
    return MetadataUtil.getBooleanMetaData(IS_ADVICE, clazz);
  }
}
