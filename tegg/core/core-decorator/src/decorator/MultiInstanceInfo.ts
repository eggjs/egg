import type { QualifierAttribute } from '@eggjs/tegg-types';
import { PrototypeUtil } from '../util/index.ts';

export function MultiInstanceInfo(attributes: QualifierAttribute[]) {
  return function (target: any, _propertyKey: PropertyKey | undefined, parameterIndex: number) {
    PrototypeUtil.setMultiInstanceConstructorIndex(target, parameterIndex);
    PrototypeUtil.setMultiInstanceConstructorAttributes(target, attributes);
  };
}
