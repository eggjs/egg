import { MetadataUtil } from '@eggjs/core-decorator';
import { POINTCUT_ADVICE_INFO_LIAR } from '@eggjs/tegg-types';
import type { AdviceInfo, EggProtoImplClass } from '@eggjs/tegg-types';

interface PointcutAdviceInfo {
  method: PropertyKey;
  adviceInfo: AdviceInfo;
}

export class PointcutAdviceInfoUtil {
  static addPointcutAdviceInfo(adviceInfo: AdviceInfo, clazz: EggProtoImplClass, method: PropertyKey): void {
    const pointcutAdviceInfoList = MetadataUtil.initOwnArrayMetaData<PointcutAdviceInfo>(
      POINTCUT_ADVICE_INFO_LIAR,
      clazz,
      [],
    );
    // FIXME: parent/child should has correct order
    pointcutAdviceInfoList.unshift({
      method,
      adviceInfo,
    });
  }

  static getPointcutAdviceInfoList(clazz: EggProtoImplClass, method: PropertyKey): Array<AdviceInfo> {
    const pointcutAdviceInfoList: Array<PointcutAdviceInfo> | undefined =
      MetadataUtil.getMetaData(POINTCUT_ADVICE_INFO_LIAR, clazz) || [];
    return pointcutAdviceInfoList.filter((t) => t.method === method).map((t) => t.adviceInfo);
  }
}
