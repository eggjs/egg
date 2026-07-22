import type { MCPControllerMeta } from '@eggjs/controller-decorator';
import type { EggPrototype } from '@eggjs/metadata';
import { CONTROLLER_META_DATA } from '@eggjs/tegg-types';

import type { ControllerRegister } from '../../ControllerRegister.ts';
import type { McpRouter, McpServerRegistration } from './McpRouter.ts';

/** Collects MCP controllers and groups their methods by server name. */
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
          // The first controller supplies the shared server metadata.
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
