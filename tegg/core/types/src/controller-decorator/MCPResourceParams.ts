import type { ResourceTemplate, ResourceMetadata, McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';

export interface MCPResourceUriParams {
  name?: string;
  uri: string;
  metadata?: ResourceMetadata;
  timeout?: number;
}

export interface MCPResourceTemplateParams {
  name?: string;
  template: ConstructorParameters<typeof ResourceTemplate>;
  metadata?: ResourceMetadata;
  timeout?: number;
}

export type ResourceExtra = Parameters<Parameters<McpServer['resource']>['3']>['2'];
export type ResourceVariables = Parameters<Parameters<McpServer['resource']>['3']>['1'];

export type MCPResourceParams = MCPResourceUriParams | MCPResourceTemplateParams;

export type MCPResourceResponse = ReadResourceResult;
