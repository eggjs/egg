import type { EggProtoImplClass, ObjectInitTypeLike } from '@eggjs/tegg-types';
import { InitTypeQualifierAttribute } from '@eggjs/tegg-types';

import { QualifierUtil } from '../util/index.ts';

export function InitTypeQualifier(initType: ObjectInitTypeLike) {
  return function (target: any, propertyKey?: PropertyKey, parameterIndex?: number): void {
    QualifierUtil.addInjectQualifier(
      target as EggProtoImplClass,
      propertyKey,
      parameterIndex,
      InitTypeQualifierAttribute,
      initType,
    );
  };
}
