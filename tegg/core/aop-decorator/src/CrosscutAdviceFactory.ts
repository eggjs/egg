import assert from 'node:assert';
import type { EggProtoImplClass, IAdvice, AdviceInfo } from '@eggjs/tegg-types';

import { CrosscutInfoUtil } from './util/index.ts';

export class CrosscutAdviceFactory {
  private readonly crosscutAdviceClazzList: Array<EggProtoImplClass<IAdvice>> = [];

  registerCrossAdviceClazz(clazz: EggProtoImplClass<IAdvice>) {
    assert(CrosscutInfoUtil.isCrosscutAdvice(clazz), `clazz ${clazz.name} is not crosscut advice`);
    this.crosscutAdviceClazzList.push(clazz);
  }

  getAdvice(clazz: EggProtoImplClass, method: PropertyKey): Array<AdviceInfo> {
    const result: Array<AdviceInfo> = [];
    for (const crosscutAdviceClazz of this.crosscutAdviceClazzList) {
      const crosscutInfoList = CrosscutInfoUtil.getCrosscutInfoList(crosscutAdviceClazz);
      for (const crosscutInfo of crosscutInfoList) {
        if (crosscutInfo.pointcutInfo.match(clazz, method)) {
          result.push(crosscutInfo.adviceInfo);
        }
      }
    }
    return result;
  }
}
