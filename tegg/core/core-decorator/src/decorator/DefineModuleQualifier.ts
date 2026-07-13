import { DefineModuleQualifierAttribute } from '@eggjs/tegg-types';
import type { EggProtoImplClass } from '@eggjs/tegg-types';

import { QualifierUtil } from '../util/index.ts';

export function DefineModuleQualifier(moduleName: string) {
  return function (target: any, propertyKey?: PropertyKey, parameterIndex?: number): void {
    QualifierUtil.addInjectQualifier(
      target as EggProtoImplClass,
      propertyKey,
      parameterIndex,
      DefineModuleQualifierAttribute,
      moduleName,
    );
  };
}
