import { MetadataUtil } from '@eggjs/core-decorator';
import { IS_CROSSCUT_ADVICE, CROSSCUT_INFO_LIST } from '@eggjs/tegg-types';
import type { CrosscutInfo, EggProtoImplClass, IAdvice } from '@eggjs/tegg-types';

export class CrosscutInfoUtil {
  static setIsCrosscutAdvice(isCrosscutAdvice: boolean, clazz: EggProtoImplClass<IAdvice>) {
    MetadataUtil.defineMetaData(IS_CROSSCUT_ADVICE, isCrosscutAdvice, clazz);
  }

  static isCrosscutAdvice(clazz: EggProtoImplClass<IAdvice>): boolean {
    return !!MetadataUtil.getMetaData(IS_CROSSCUT_ADVICE, clazz);
  }

  static addCrosscutInfo(crosscutInfo: CrosscutInfo, clazz: EggProtoImplClass<IAdvice>) {
    const crosscutInfoList = MetadataUtil.initOwnArrayMetaData<CrosscutInfo>(CROSSCUT_INFO_LIST, clazz, []);
    crosscutInfoList.push(crosscutInfo);
  }

  static getCrosscutInfoList(clazz: EggProtoImplClass<IAdvice>): Array<CrosscutInfo> {
    return MetadataUtil.getArrayMetaData(CROSSCUT_INFO_LIST, clazz) || [];
  }
}
