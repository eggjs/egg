import { MetadataUtil } from '@eggjs/core-decorator';
import { IS_ADVICE } from '@eggjs/tegg-types';
import type { EggProtoImplClass, IAdvice } from '@eggjs/tegg-types';

export class AdviceInfoUtil {
  static setIsAdvice(isAdvice: boolean, clazz: EggProtoImplClass<IAdvice>): void {
    MetadataUtil.defineMetaData(IS_ADVICE, isAdvice, clazz);
  }

  static isAdvice(clazz: EggProtoImplClass<IAdvice>): boolean {
    return !!MetadataUtil.getMetaData(IS_ADVICE, clazz);
  }
}
