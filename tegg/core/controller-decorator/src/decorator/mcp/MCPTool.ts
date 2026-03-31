import { ControllerType } from '@eggjs/tegg-types';
import type { EggProtoImplClass, MCPToolParams } from '@eggjs/tegg-types';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { MCPInfoUtil } from '../../util/MCPInfoUtil.ts';
import { MethodInfoUtil } from '../../util/MethodInfoUtil.ts';

export function MCPTool(params?: MCPToolParams): (target: any, propertyKey: PropertyKey) => void {
  return function (target: any, propertyKey: PropertyKey): void {
    const controllerClazz = target.constructor as EggProtoImplClass;
    const methodName = propertyKey as string;
    MethodInfoUtil.setMethodControllerType(controllerClazz, methodName, ControllerType.MCP);
    MCPInfoUtil.setMCPToolParams(
      {
        ...params,
        mcpName: params?.name,
        name: methodName,
      },
      controllerClazz,
      methodName,
    );
    MCPInfoUtil.setMCPTool(controllerClazz, methodName);
  };
}

export function ToolArgsSchema(
  argsSchema: Parameters<McpServer['tool']>['2'],
): (target: any, propertyKey: PropertyKey, parameterIndex: number) => void {
  return function (target: any, propertyKey: PropertyKey, parameterIndex: number): void {
    const controllerClazz = target.constructor as EggProtoImplClass;
    const methodName = propertyKey as string;
    MCPInfoUtil.setMCPToolArgsInArgs(
      {
        argsSchema,
        index: parameterIndex,
      },
      controllerClazz,
      methodName,
    );
  };
}
