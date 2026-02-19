import type { EggProtoImplClass } from '@eggjs/tegg-types';

import { MCPInfoUtil } from '../../util/MCPInfoUtil.ts';

export function Extra() {
  return function (target: any, propertyKey: PropertyKey, parameterIndex: number) {
    const controllerClazz = target.constructor as EggProtoImplClass;
    const methodName = propertyKey as string;
    MCPInfoUtil.setMCPExtra(parameterIndex, controllerClazz, methodName);
  };
}
