import assert from 'node:assert';

import { QualifierUtil } from '@eggjs/core-decorator';
import type { EggProtoImplClass, ModuleConfig, ObjectInfo } from '@eggjs/tegg-types';

export const MCPClientQualifierAttribute: symbol = Symbol.for('Qualifier.MCP_CLIENT');
export const MCPClientInjectName = 'mcpClient';

export function MCPClientQualifier(mcpClientName: string): (target: any, propertyKey: PropertyKey) => void {
  return function (target: any, propertyKey: PropertyKey): void {
    QualifierUtil.addProperQualifier(
      target.constructor as EggProtoImplClass,
      propertyKey,
      MCPClientQualifierAttribute,
      mcpClientName,
    );
  };
}

export type MCPConfigType = any;

export function getMCPClientName(objectInfo: ObjectInfo): string {
  const mcpClientName = objectInfo.qualifiers.find((t) => t.attribute === MCPClientQualifierAttribute)?.value;
  assert(mcpClientName, 'not found mcpClientName name');
  return mcpClientName as string;
}

export function getMCPClientConfig(config: ModuleConfig, objectInfo: ObjectInfo): MCPConfigType {
  const mcpClientName = getMCPClientName(objectInfo);
  const mcpClientConfig = (config as any).mcp?.clients[mcpClientName];
  if (!mcpClientConfig) {
    throw new Error(`not found ChatModel config for ${mcpClientName}`);
  }
  return mcpClientConfig!;
}
