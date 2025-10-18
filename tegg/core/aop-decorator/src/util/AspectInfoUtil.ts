import { MetadataUtil } from '@eggjs/core-decorator';
import { ASPECT_LIST } from '@eggjs/tegg-types';
import type { EggProtoImplClass, IAdvice } from '@eggjs/tegg-types';

import { Aspect } from '../model/index.ts';

export class AspectInfoUtil {
  static setAspectList(aspectList: Array<Aspect>, clazz: EggProtoImplClass<IAdvice>) {
    MetadataUtil.defineMetaData(ASPECT_LIST, aspectList, clazz);
  }

  static getAspectList(clazz: EggProtoImplClass<IAdvice>): Array<Aspect> {
    return MetadataUtil.getMetaData(ASPECT_LIST, clazz) || [];
  }
}
