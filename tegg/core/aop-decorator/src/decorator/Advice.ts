import { Prototype, PrototypeUtil } from '@eggjs/core-decorator';
import { StackUtil } from '@eggjs/tegg-common-util';
import { AccessLevel, ObjectInitType } from '@eggjs/tegg-types';
import type { EggProtoImplClass, IAdvice, PrototypeParams } from '@eggjs/tegg-types';

import { AdviceInfoUtil } from '../util/index.ts';

const defaultAdviceParam = {
  accessLevel: AccessLevel.PUBLIC,
  initType: ObjectInitType.SINGLETON,
};

export function Advice(param?: PrototypeParams) {
  return function (constructor: EggProtoImplClass<IAdvice>) {
    AdviceInfoUtil.setIsAdvice(true, constructor);
    const func = Prototype({
      ...defaultAdviceParam,
      ...param,
    });
    func(constructor);
    PrototypeUtil.setFilePath(constructor, StackUtil.getCalleeFromStack(false, 5));
  };
}
