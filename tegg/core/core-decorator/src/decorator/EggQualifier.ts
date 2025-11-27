import type { EggProtoImplClass, EggType } from '@eggjs/tegg-types';
import { EggQualifierAttribute } from '@eggjs/tegg-types';

import { QualifierUtil } from '../util/index.ts';

export function EggQualifier(eggType: EggType) {
  return function (target: any, propertyKey?: PropertyKey, parameterIndex?: number): void {
    QualifierUtil.addInjectQualifier(
      target as EggProtoImplClass,
      propertyKey,
      parameterIndex,
      EggQualifierAttribute,
      eggType,
    );
  };
}
