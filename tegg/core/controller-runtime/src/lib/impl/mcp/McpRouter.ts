import type { MCPControllerMeta, MCPPromptMeta, MCPResourceMeta, MCPToolMeta } from '@eggjs/controller-decorator';
import type { EggPrototype } from '@eggjs/tegg-types';

/**
 * The shared DI object name for the host-specific MCP router. Both hosts
 * (egg controller plugin, service worker) provide their own implementation
 * under this name; because the two host plugins are never used together the
 * names do not collide.
 */
export const MCP_ROUTER_NAME = 'mcpRouter';

/**
 * A single collected controller record: the owning controller proto and the
 * tool/resource/prompt metadata. The host router turns these into MCP server
 * registrations at request time.
 */
export interface ServerRegisterRecord<T> {
  proto: EggPrototype;
  meta: T;
}

/**
 * One MCP server's complete set of collected controller records. The register
 * hands this to the host router once, after all controller-bearing load units
 * have been created.
 */
export interface McpServerRegistration {
  /** `'default'` for the unnamed server, otherwise the multiple-server name. */
  serverName: string;
  controllerMeta: MCPControllerMeta;
  tools: ServerRegisterRecord<MCPToolMeta>[];
  resources: ServerRegisterRecord<MCPResourceMeta>[];
  prompts: ServerRegisterRecord<MCPPromptMeta>[];
}

/**
 * The transport boundary between the host-agnostic MCP controller register
 * (which only COLLECTS records) and the host-specific transport wiring (egg
 * node HTTP routes, service worker fetch routes). The register calls
 * `registerServer` once for each complete server registration; the router owns
 * everything about how requests reach those records.
 */
export interface McpRouter {
  registerServer(reg: McpServerRegistration): void;
}
