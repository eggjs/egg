import { MetadataUtil } from '@eggjs/core-decorator';
import {
  CONTROLLER_MCP_NAME,
  CONTROLLER_MCP_PROMPT_MAP,
  CONTROLLER_MCP_RESOURCE_MAP,
  CONTROLLER_MCP_RESOURCE_PARAMS_MAP,
  CONTROLLER_MCP_TOOL_MAP,
  CONTROLLER_MCP_TOOL_PARAMS_MAP,
  CONTROLLER_MCP_VERSION,
  CONTROLLER_MCP_TOOL_ARGS_INDEX,
  CONTROLLER_MCP_PROMPT_ARGS_INDEX,
  CONTROLLER_MCP_EXTRA_INDEX,
  CONTROLLER_MCP_PROMPT_PARAMS_MAP,
  CONTROLLER_MCP_CONTROLLER_PARAMS_MAP,
} from '@eggjs/tegg-types';
import type {
  MCPPromptParams,
  MCPResourceParams,
  MCPToolParams,
  EggProtoImplClass,
  MCPControllerParams,
} from '@eggjs/tegg-types';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

type MCPMethodMap = Map<string, boolean>;
type MCPResourceMap = Map<string, MCPResourceParams>;
type MCPToolMap = Map<string, MCPToolParams>;
type MCPPromptMap = Map<string, MCPPromptParams>;

export interface ToolArgsSchemaDetail {
  argsSchema: Parameters<McpServer['tool']>['2'];
  index: number;
}
type MCPToolArgsSchemaMap = Map<string, ToolArgsSchemaDetail>;

type MCPExtraMap = Map<string, number>;

export interface PromptArgsSchemaDetail {
  argsSchema: Parameters<McpServer['prompt']>['2'];
  index: number;
}
type MCPPromptArgsSchemaMap = Map<string, PromptArgsSchemaDetail>;

export class MCPInfoUtil {
  static setMCPName(name: string, clazz: EggProtoImplClass): void {
    MetadataUtil.defineMetaData(CONTROLLER_MCP_NAME, name, clazz);
  }

  static getMCPName(clazz: EggProtoImplClass): string | undefined {
    return MetadataUtil.getMetaData(CONTROLLER_MCP_NAME, clazz);
  }

  static setMCPVersion(version: string, clazz: EggProtoImplClass): void {
    MetadataUtil.defineMetaData(CONTROLLER_MCP_VERSION, version, clazz);
  }

  static getMCPVersion(clazz: EggProtoImplClass): string | undefined {
    return MetadataUtil.getMetaData(CONTROLLER_MCP_VERSION, clazz);
  }

  static setMCPControllerParams(params: MCPControllerParams | undefined, clazz: EggProtoImplClass): void {
    MetadataUtil.defineMetaData(CONTROLLER_MCP_CONTROLLER_PARAMS_MAP, params, clazz);
  }

  static getMCPControllerParams(clazz: EggProtoImplClass): MCPControllerParams | undefined {
    return MetadataUtil.getMetaData(CONTROLLER_MCP_CONTROLLER_PARAMS_MAP, clazz);
  }

  static setMCPResource(clazz: EggProtoImplClass, methodName: string): void {
    const methodMap: MCPMethodMap = MetadataUtil.initOwnMapMetaData(CONTROLLER_MCP_RESOURCE_MAP, clazz, new Map());
    methodMap.set(methodName, true);
  }

  static getMCPResource(clazz: EggProtoImplClass): string[] {
    const methodMap: MCPMethodMap | undefined = MetadataUtil.getMetaData(CONTROLLER_MCP_RESOURCE_MAP, clazz);
    if (!methodMap) {
      return [];
    }
    return Array.from(methodMap.keys());
  }

  static setMCPResourceParams(
    params: MCPResourceParams & { mcpName?: string },
    clazz: EggProtoImplClass,
    resourceName: string,
  ): void {
    const methodMap: MCPResourceMap = MetadataUtil.initOwnMapMetaData(
      CONTROLLER_MCP_RESOURCE_PARAMS_MAP,
      clazz,
      new Map(),
    );
    methodMap.set(resourceName, params);
  }

  static getMCPResourceParams(
    clazz: EggProtoImplClass,
    resourceName: string,
  ): (MCPResourceParams & { mcpName?: string }) | undefined {
    const methodMap: MCPResourceMap | undefined = MetadataUtil.getMetaData(CONTROLLER_MCP_RESOURCE_PARAMS_MAP, clazz);
    return methodMap?.get(resourceName);
  }

  static setMCPTool(clazz: EggProtoImplClass, methodName: string): void {
    const methodMap: MCPMethodMap = MetadataUtil.initOwnMapMetaData(CONTROLLER_MCP_TOOL_MAP, clazz, new Map());
    methodMap.set(methodName, true);
  }

  static getMCPTool(clazz: EggProtoImplClass): string[] {
    const methodMap: MCPMethodMap | undefined = MetadataUtil.getMetaData(CONTROLLER_MCP_TOOL_MAP, clazz);
    if (!methodMap) {
      return [];
    }
    return Array.from(methodMap.keys());
  }

  static getMCPToolParams(
    clazz: EggProtoImplClass,
    resourceName: string,
  ): (MCPToolParams & { mcpName?: string }) | undefined {
    const methodMap: MCPToolMap | undefined = MetadataUtil.getMetaData(CONTROLLER_MCP_TOOL_PARAMS_MAP, clazz);
    return methodMap?.get(resourceName);
  }

  static setMCPToolParams(
    params: MCPToolParams & { mcpName?: string },
    clazz: EggProtoImplClass,
    resourceName: string,
  ): void {
    const methodMap: MCPToolMap = MetadataUtil.initOwnMapMetaData(CONTROLLER_MCP_TOOL_PARAMS_MAP, clazz, new Map());
    methodMap.set(resourceName, params);
  }

  static setMCPPrompt(clazz: EggProtoImplClass, methodName: string): void {
    const methodMap: MCPMethodMap = MetadataUtil.initOwnMapMetaData(CONTROLLER_MCP_PROMPT_MAP, clazz, new Map());
    methodMap.set(methodName, true);
  }

  static getMCPPrompt(clazz: EggProtoImplClass): string[] {
    const methodMap: MCPMethodMap | undefined = MetadataUtil.getMetaData(CONTROLLER_MCP_PROMPT_MAP, clazz);
    if (!methodMap) {
      return [];
    }
    return Array.from(methodMap.keys());
  }

  static setMCPPromptParams(
    params: MCPPromptParams & { mcpName?: string },
    clazz: EggProtoImplClass,
    resourceName: string,
  ): void {
    const methodMap: MCPPromptMap = MetadataUtil.initOwnMapMetaData(CONTROLLER_MCP_PROMPT_PARAMS_MAP, clazz, new Map());
    methodMap.set(resourceName, params);
  }

  static getMCPPromptParams(
    clazz: EggProtoImplClass,
    resourceName: string,
  ): (MCPPromptParams & { mcpName?: string }) | undefined {
    const methodMap: MCPPromptMap | undefined = MetadataUtil.getMetaData(CONTROLLER_MCP_PROMPT_PARAMS_MAP, clazz);
    return methodMap?.get(resourceName);
  }

  static setMCPToolArgsInArgs(detail: ToolArgsSchemaDetail, clazz: EggProtoImplClass, methodName: string): void {
    const methodContextIndexMap: MCPToolArgsSchemaMap = MetadataUtil.initOwnMapMetaData(
      CONTROLLER_MCP_TOOL_ARGS_INDEX,
      clazz,
      new Map(),
    );
    methodContextIndexMap.set(methodName, detail);
  }

  static getMCPToolArgsIndex(clazz: EggProtoImplClass, methodName: string): ToolArgsSchemaDetail | undefined {
    const methodContextIndexMap: MCPToolArgsSchemaMap | undefined = MetadataUtil.getMetaData(
      CONTROLLER_MCP_TOOL_ARGS_INDEX,
      clazz,
    );
    return methodContextIndexMap?.get(methodName);
  }

  static setMCPExtra(index: number, clazz: EggProtoImplClass, methodName: string): void {
    const methodContextIndexMap: MCPExtraMap = MetadataUtil.initOwnMapMetaData(
      CONTROLLER_MCP_EXTRA_INDEX,
      clazz,
      new Map(),
    );
    methodContextIndexMap.set(methodName, index);
  }

  static getMCPExtra(clazz: EggProtoImplClass, methodName: string): number | undefined {
    const methodContextIndexMap: MCPExtraMap | undefined = MetadataUtil.getMetaData(CONTROLLER_MCP_EXTRA_INDEX, clazz);
    return methodContextIndexMap?.get(methodName);
  }

  static setMCPPromptArgsInArgs(detail: PromptArgsSchemaDetail, clazz: EggProtoImplClass, methodName: string): void {
    const methodContextIndexMap: MCPPromptArgsSchemaMap = MetadataUtil.initOwnMapMetaData(
      CONTROLLER_MCP_PROMPT_ARGS_INDEX,
      clazz,
      new Map(),
    );
    methodContextIndexMap.set(methodName, detail);
  }

  static getMCPPromptArgsIndex(clazz: EggProtoImplClass, methodName: string): PromptArgsSchemaDetail | undefined {
    const methodContextIndexMap: MCPPromptArgsSchemaMap | undefined = MetadataUtil.getMetaData(
      CONTROLLER_MCP_PROMPT_ARGS_INDEX,
      clazz,
    );
    return methodContextIndexMap?.get(methodName);
  }
}
