import { ControllerType } from '@eggjs/tegg-types';
import type { EggProtoImplClass, MCPPromptParams } from '@eggjs/tegg-types';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { MCPInfoUtil } from '../../util/MCPInfoUtil.ts';
import { MethodInfoUtil } from '../../util/MethodInfoUtil.ts';

export function MCPPrompt(params?: MCPPromptParams): (target: any, propertyKey: PropertyKey) => void {
  return function (target: any, propertyKey: PropertyKey): void {
    const controllerClazz = target.constructor as EggProtoImplClass;
    const methodName = propertyKey as string;
    MethodInfoUtil.setMethodControllerType(controllerClazz, methodName, ControllerType.MCP);
    MCPInfoUtil.setMCPPromptParams(
      {
        ...params,
        mcpName: params?.name,
        name: methodName,
      },
      controllerClazz,
      methodName,
    );
    MCPInfoUtil.setMCPPrompt(controllerClazz, methodName);
  };
}

export function PromptArgsSchema(
  argsSchema: Parameters<McpServer['prompt']>['2'],
): (target: any, propertyKey: PropertyKey, parameterIndex: number) => void {
  return function (target: any, propertyKey: PropertyKey, parameterIndex: number): void {
    const controllerClazz = target.constructor as EggProtoImplClass;
    const methodName = propertyKey as string;
    MCPInfoUtil.setMCPPromptArgsInArgs(
      {
        argsSchema,
        index: parameterIndex,
      },
      controllerClazz,
      methodName,
    );
  };
}
