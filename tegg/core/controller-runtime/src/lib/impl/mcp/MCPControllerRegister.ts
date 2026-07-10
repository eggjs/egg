import type { MCPControllerMeta } from '@eggjs/controller-decorator';
import type { EggPrototype } from '@eggjs/metadata';
import { EggContainerFactory } from '@eggjs/tegg-runtime';
import { CONTROLLER_META_DATA } from '@eggjs/tegg-types';

import type { ControllerRegister } from '../../ControllerRegister.ts';
import type { McpRouter, ServerRegisterRecord } from './McpRouter.ts';

/**
 * Host-agnostic, COLLECT-ONLY MCP controller register.
 *
 * It accumulates controller protos and, on `register()`, reads each proto's
 * MCP metadata and collects tool/resource/prompt records into a per-server-name
 * map. All transport (route mounting, sessions, SSE/stream/stateless handling,
 * ping, proxy hooks) lives behind the injected {@link McpRouter}: the first
 * time a server name is seen the register hands the router the LIVE record
 * arrays via `registerServer`, and the router mounts transport once and reads
 * those arrays lazily at request time.
 */
export class MCPControllerRegister implements ControllerRegister {
  readonly eggContainerFactory: typeof EggContainerFactory;
  private readonly controllerMeta: MCPControllerMeta;
  private readonly mcpRouter: McpRouter;
  private controllerProtos: EggPrototype[] = [];
  private registeredControllerProtos: EggPrototype[] = [];

  registerMap: Record<
    string,
    {
      tools: ServerRegisterRecord<any>[];
      prompts: ServerRegisterRecord<any>[];
      resources: ServerRegisterRecord<any>[];
    }
  > = {};

  constructor(controllerMeta: MCPControllerMeta, mcpRouter: McpRouter) {
    // Direct import, not a read off the (possibly proxied) app — see
    // HTTPControllerRegister.create.
    this.eggContainerFactory = EggContainerFactory;
    this.controllerMeta = controllerMeta;
    this.mcpRouter = mcpRouter;
  }

  addControllerProto(proto: EggPrototype): void {
    this.controllerProtos.push(proto);
  }

  async register(): Promise<void> {
    for (const proto of this.controllerProtos) {
      if (this.registeredControllerProtos.includes(proto)) {
        continue;
      }
      const metadata = proto.getMetaData(CONTROLLER_META_DATA) as MCPControllerMeta;
      const serverName = metadata.name ?? 'default';

      // The first time a server name appears, create its (live) record entry
      // and hand it to the host router so the router mounts transport once.
      const isNew = !this.registerMap[serverName];
      const entry = (this.registerMap[serverName] ??= {
        prompts: [],
        resources: [],
        tools: [],
      });
      if (isNew) {
        this.mcpRouter.registerServer({
          serverName,
          controllerMeta: this.controllerMeta,
          tools: entry.tools,
          resources: entry.resources,
          prompts: entry.prompts,
        });
      }

      const getOrCreateEggObject = this.eggContainerFactory.getOrCreateEggObject.bind(this.eggContainerFactory);
      for (const prompt of metadata.prompts) {
        entry.prompts.push({ getOrCreateEggObject, proto, meta: prompt });
      }
      for (const resource of metadata.resources) {
        entry.resources.push({ getOrCreateEggObject, proto, meta: resource });
      }
      for (const tool of metadata.tools) {
        entry.tools.push({ getOrCreateEggObject, proto, meta: tool });
      }
      this.registeredControllerProtos.push(proto);
    }
  }
}
