import { ConfigSourceQualifierAttribute } from '@eggjs/tegg-types';
import type { EggProtoImplClass } from '@eggjs/tegg-types';

import { QualifierUtil } from '../util/index.ts';

export function ConfigSourceQualifier(moduleName: string) {
  return function (target: any, propertyKey?: PropertyKey, parameterIndex?: number) {
    QualifierUtil.addInjectQualifier(
      target as EggProtoImplClass,
      propertyKey,
      parameterIndex,
      ConfigSourceQualifierAttribute,
      moduleName
    );
  };
}
