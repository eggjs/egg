import { PointcutType } from '@eggjs/tegg-types';
import type { CrosscutInfo, EggProtoImplClass, IAdvice, CrosscutParam, CrosscutOptions } from '@eggjs/tegg-types';

import { CrosscutInfoUtil } from '../util/index.ts';
import { ClassPointInfo, CustomPointInfo, NamePointInfo } from '../model/index.ts';

const defaultCrossOptions = {
  order: 100,
};

export function Crosscut(param: CrosscutParam, options?: CrosscutOptions) {
  return function (constructor: EggProtoImplClass<IAdvice>) {
    let crosscutInfo: CrosscutInfo;
    if (param.type === PointcutType.CLASS) {
      crosscutInfo = {
        pointcutInfo: new ClassPointInfo(param.clazz, param.methodName),
        adviceInfo: {
          clazz: constructor,
          order: options?.order ?? defaultCrossOptions.order,
          adviceParams: options?.adviceParams,
        },
      };
    } else if (param.type === PointcutType.NAME) {
      crosscutInfo = {
        pointcutInfo: new NamePointInfo(param.className, param.methodName),
        adviceInfo: {
          clazz: constructor,
          order: options?.order ?? defaultCrossOptions.order,
          adviceParams: options?.adviceParams,
        },
      };
    } else {
      crosscutInfo = {
        pointcutInfo: new CustomPointInfo(param.callback),
        adviceInfo: {
          clazz: constructor,
          order: options?.order ?? defaultCrossOptions.order,
          adviceParams: options?.adviceParams,
        },
      };
    }
    CrosscutInfoUtil.setIsCrosscutAdvice(true, constructor);
    CrosscutInfoUtil.addCrosscutInfo(crosscutInfo, constructor);
  };
}
