import type { HttpClientOptions } from '@eggjs/mcp-client';
import { mergeHeaders, HttpMCPClient } from '@eggjs/mcp-client';
import type { Logger } from '@eggjs/tegg';
import { ContextHandler } from '@eggjs/tegg-runtime';
import type { fetch } from 'urllib';

import { McpMethod } from './constants.ts';
const MCP_METHOD = Symbol('Context#mcpMethod');
const MCP_TOOL = Symbol('Context#mcpTool');
export interface EggHttpMCPClientOptions {
  clientName: string;
  clientVersion: string;
  logger: Logger;
  transportOptions?: HttpClientOptions['transportOptions'];
  requestOptions?: HttpClientOptions['requestOptions'];
  fetch: typeof fetch;
  transportType: HttpClientOptions['transportType'];
  url: string;
}
export class EggHttpMCPClient extends HttpMCPClient {
  declare protected readonly logger: Logger;
  constructor(options: EggHttpMCPClientOptions) {
    super(
      {
        name: options.clientName,
        version: options.clientVersion,
      },
      {
        fetch: options.fetch,
        transportType: options.transportType,
        url: options.url,
        logger: options.logger,
        transportOptions: {
          ...options.transportOptions,
          get requestInit() {
            return {
              ...options.transportOptions?.requestInit,
              get headers() {
                return mergeHeaders(options.transportOptions?.requestInit?.headers);
              },
            };
          },
        },
        requestOptions: options.requestOptions,
      },
    );
    this.logger = options.logger;
  }
  async init(): Promise<void> {
    await super.init();
  }
  async listTools(
    params?: Parameters<HttpMCPClient['listTools']>['0'],
    options?: Parameters<HttpMCPClient['listTools']>['1'],
  ): ReturnType<HttpMCPClient['listTools']> {
    const context = ContextHandler.getContext();
    if (context) {
      context.set(MCP_METHOD, McpMethod.LIST_TOOLS);
    }
    return super.listTools(params, options);
  }
  async listPrompts(
    params?: Parameters<HttpMCPClient['listPrompts']>['0'],
    options?: Parameters<HttpMCPClient['listPrompts']>['1'],
  ): ReturnType<HttpMCPClient['listPrompts']> {
    const context = ContextHandler.getContext();
    if (context) {
      context.set(MCP_METHOD, McpMethod.LIST_PROMPTS);
    }
    return super.listPrompts(params, options);
  }
  async listResources(
    params?: Parameters<HttpMCPClient['listResources']>['0'],
    options?: Parameters<HttpMCPClient['listResources']>['1'],
  ): ReturnType<HttpMCPClient['listResources']> {
    const context = ContextHandler.getContext();
    if (context) {
      context.set(MCP_METHOD, McpMethod.LIST_RESOURCES);
    }
    return super.listResources(params, options);
  }
  async connect(
    transport: Parameters<HttpMCPClient['connect']>['0'],
    options?: Parameters<HttpMCPClient['connect']>['1'],
  ): ReturnType<HttpMCPClient['connect']> {
    const context = ContextHandler.getContext();
    if (context) {
      context.set(MCP_METHOD, McpMethod.INITIALIZE);
    }
    return super.connect(transport, options);
  }
  async notification(
    notification: Parameters<HttpMCPClient['notification']>['0'],
    options?: Parameters<HttpMCPClient['notification']>['1'],
  ): ReturnType<HttpMCPClient['notification']> {
    if (notification?.method === 'notifications/initialized') {
      const context = ContextHandler.getContext();
      if (context) {
        context.set(MCP_METHOD, McpMethod.NOTIFICATION_INIT);
      }
    }
    return super.notification(notification, options);
  }
  async callTool(
    params: Parameters<HttpMCPClient['callTool']>['0'],
    resultSchema?: Parameters<HttpMCPClient['callTool']>['1'],
    options?: Parameters<HttpMCPClient['callTool']>['2'],
  ): ReturnType<HttpMCPClient['callTool']> {
    const context = ContextHandler.getContext();
    if (context) {
      context.set(MCP_TOOL, params?.name);
      context.set(MCP_METHOD, McpMethod.CALL_TOOLS);
    }
    return super.callTool(params, resultSchema, options);
  }
}
