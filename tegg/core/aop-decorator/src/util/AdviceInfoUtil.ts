import { MetadataUtil } from '@eggjs/core-decorator';
import type { EggProtoImplClass, IAdvice } from '@eggjs/tegg-types';

export const IS_ADVICE = Symbol.for('EggPrototype#isAdvice');

export class AdviceInfoUtil {
  static setIsAdvice(isAdvice: boolean, clazz: EggProtoImplClass<IAdvice>) {
    MetadataUtil.defineMetaData(IS_ADVICE, isAdvice, clazz);
  }

  static isAdvice(clazz: EggProtoImplClass<IAdvice>): boolean {
    return !!MetadataUtil.getMetaData(IS_ADVICE, clazz);
  }
}
