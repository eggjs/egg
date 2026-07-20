import type { MCPControllerMeta, MCPPromptMeta, MCPResourceMeta, MCPToolMeta } from '@eggjs/controller-decorator';
import type { EggPrototype } from '@eggjs/tegg-types';

/** Shared injection name for the host's MCP router. */
export const MCP_ROUTER_NAME = 'mcpRouter';

/** An MCP method and the controller prototype that owns it. */
export interface ServerRegisterRecord<T> {
  proto: EggPrototype;
  meta: T;
}

/** All controller records collected for one MCP server. */
export interface McpServerRegistration {
  /** `'default'` for the unnamed server. */
  serverName: string;
  controllerMeta: MCPControllerMeta;
  tools: ServerRegisterRecord<MCPToolMeta>[];
  resources: ServerRegisterRecord<MCPResourceMeta>[];
  prompts: ServerRegisterRecord<MCPPromptMeta>[];
}

/** Host-specific transport for collected MCP server registrations. */
export interface McpRouter {
  registerServer(reg: McpServerRegistration): void;
}
