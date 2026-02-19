import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ShapeOutput } from '@modelcontextprotocol/sdk/server/zod-compat.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export type ToolArgs<T extends Parameters<McpServer['tool']>['2']> = ShapeOutput<T>;
export type ToolExtra = Parameters<Parameters<McpServer['tool']>['4']>['1'];

export type MCPToolResponse = CallToolResult;

export interface MCPToolParams {
  name?: string;
  description?: string;
  timeout?: number;
}
