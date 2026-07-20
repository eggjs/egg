import type { MCPControllerMeta } from '@eggjs/controller-decorator';
import type { EggPrototype } from '@eggjs/metadata';
import { CONTROLLER_META_DATA } from '@eggjs/tegg-types';

import type { ControllerRegister } from '../../ControllerRegister.ts';
import type { McpRouter, McpServerRegistration } from './McpRouter.ts';

/**
 * Host-agnostic, COLLECT-ONLY MCP controller register.
 *
 * It accumulates controller protos while load units are created, then
 * `doRegister()` groups all tool/resource/prompt records by server name and
 * hands each complete registration to the host router once. All transport
 * concerns (route mounting, sessions, SSE/stream/stateless handling, ping,
 * proxy hooks) live behind the injected {@link McpRouter}.
 */
export class MCPControllerRegister implements ControllerRegister {
  private readonly mcpRouter: McpRouter;
  private controllerProtos: EggPrototype[] = [];

  constructor(mcpRouter: McpRouter) {
    this.mcpRouter = mcpRouter;
  }

  addControllerProto(proto: EggPrototype): void {
    this.controllerProtos.push(proto);
  }

  register(): Promise<void> {
    // Registration is finalized once, after all controller-bearing load units
    // have been created. This mirrors HTTPControllerRegister.register().
    return Promise.resolve();
  }

  doRegister(): void {
    const registrationMap = new Map<string, McpServerRegistration>();
    for (const proto of this.controllerProtos) {
      const metadata = proto.getMetaData(CONTROLLER_META_DATA) as MCPControllerMeta;
      const serverName = metadata.name ?? 'default';

      let registration = registrationMap.get(serverName);
      if (!registration) {
        registration = {
          serverName,
          // Preserve the existing first-controller-wins rule for a server's
          // advertised name/version while aggregating every controller's methods.
          controllerMeta: metadata,
          prompts: [],
          resources: [],
          tools: [],
        };
        registrationMap.set(serverName, registration);
      }

      for (const prompt of metadata.prompts) {
        registration.prompts.push({ proto, meta: prompt });
      }
      for (const resource of metadata.resources) {
        registration.resources.push({ proto, meta: resource });
      }
      for (const tool of metadata.tools) {
        registration.tools.push({ proto, meta: tool });
      }
    }

    for (const registration of registrationMap.values()) {
      this.mcpRouter.registerServer(registration);
    }
  }
}
