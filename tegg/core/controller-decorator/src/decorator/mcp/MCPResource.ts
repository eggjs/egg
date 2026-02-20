import { ControllerType } from '@eggjs/tegg-types';
import type { EggProtoImplClass, MCPResourceParams } from '@eggjs/tegg-types';

import { MCPInfoUtil } from '../../util/MCPInfoUtil.ts';
import { MethodInfoUtil } from '../../util/MethodInfoUtil.ts';

export function MCPResource(params: MCPResourceParams): (target: any, propertyKey: PropertyKey) => void {
  return function (target: any, propertyKey: PropertyKey): void {
    const controllerClazz = target.constructor as EggProtoImplClass;
    const methodName = propertyKey as string;
    MethodInfoUtil.setMethodControllerType(controllerClazz, methodName, ControllerType.MCP);
    MCPInfoUtil.setMCPResourceParams(
      {
        ...params,
        mcpName: params.name,
        name: methodName,
      },
      controllerClazz,
      methodName,
    );
    MCPInfoUtil.setMCPResource(controllerClazz, methodName);
  };
}
