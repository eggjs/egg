import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ShapeOutput } from '@modelcontextprotocol/sdk/server/zod-compat.js';
import type { GetPromptResult } from '@modelcontextprotocol/sdk/types.js';

export type PromptArgs<T extends Parameters<McpServer['prompt']>['2']> = ShapeOutput<T>;
export type PromptExtra = Parameters<Parameters<McpServer['prompt']>['3']>['1'];

export type MCPPromptResponse = GetPromptResult;

export interface MCPPromptParams {
  name?: string;
  description?: string;
  timeout?: number;
  title?: string;
}
