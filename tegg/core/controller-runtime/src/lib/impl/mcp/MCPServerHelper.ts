import type { MCPControllerMeta, MCPPromptMeta, MCPResourceMeta, MCPToolMeta } from '@eggjs/controller-decorator';
import { CONTROLLER_META_DATA } from '@eggjs/tegg-types';
import type { EggObject, EggObjectName, EggPrototype } from '@eggjs/tegg-types';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ReadResourceCallback, ToolCallback, PromptCallback } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * The host-agnostic slice of the MCP controller hooks: a schema loader that
 * resolves tool/prompt args schemas when the decorated metadata has none.
 * The egg host passes its (per-app, live) EggMcpRouter.hooks list.
 */
export interface MCPSchemaLoaderHook {
  schemaLoader?: (
    controllerMeta: MCPControllerMeta,
    meta: MCPPromptMeta | MCPToolMeta,
  ) => Promise<Parameters<McpServer['tool']>['2'] | undefined>;
}

export interface MCPServerHelperOptions {
  name: string;
  version: string;
  hooks?: readonly MCPSchemaLoaderHook[];
}

export class MCPServerHelper {
  server: McpServer;
  hooks: readonly MCPSchemaLoaderHook[];
  constructor(opts: MCPServerHelperOptions) {
    this.server = new McpServer(
      {
        name: opts.name,
        version: opts.version,
      },
      { capabilities: { logging: {} } },
    );
    this.hooks = opts.hooks ?? [];
  }

  private async loadSchema(
    controllerMeta: MCPControllerMeta,
    meta: MCPPromptMeta | MCPToolMeta,
  ): Promise<Parameters<McpServer['tool']>['2'] | undefined> {
    for (const hook of this.hooks) {
      const schema = await hook.schemaLoader?.(controllerMeta, meta);
      if (schema) {
        return schema;
      }
    }
  }

  async mcpResourceRegister(
    getOrCreateEggObject: (proto: EggPrototype, name?: EggObjectName) => Promise<EggObject>,
    controllerProto: EggPrototype,
    resourceMeta: MCPResourceMeta,
  ): Promise<void> {
    const handler = async (...args: any[]) => {
      const eggObj = await getOrCreateEggObject(controllerProto, controllerProto.name);
      const realObj = eggObj.obj;
      const realMethod = realObj[resourceMeta.name];
      return Reflect.apply(realMethod, realObj, args) as ReturnType<ReadResourceCallback>;
    };
    const name = resourceMeta.mcpName ?? resourceMeta.name;
    if (resourceMeta.uri) {
      this.server.registerResource(name, resourceMeta.uri, resourceMeta.metadata ?? {}, handler);
    } else if (resourceMeta.template) {
      this.server.registerResource(name, resourceMeta.template, resourceMeta.metadata ?? {}, handler);
    } else {
      throw new Error(`MCPResource ${name} must have uri or template`);
    }
  }

  async mcpToolRegister(
    getOrCreateEggObject: (proto: EggPrototype, name?: EggObjectName) => Promise<EggObject>,
    controllerProto: EggPrototype,
    toolMeta: MCPToolMeta,
  ): Promise<void> {
    const controllerMeta = controllerProto.getMetaData(CONTROLLER_META_DATA) as MCPControllerMeta;
    const name: string = toolMeta.mcpName ?? toolMeta.name;
    const description: string | undefined = toolMeta.description;
    let schema: NonNullable<(typeof toolMeta)['detail']>['argsSchema'] | undefined;
    if (toolMeta.detail?.argsSchema) {
      schema = toolMeta.detail?.argsSchema;
    } else {
      schema = await this.loadSchema(controllerMeta, toolMeta);
    }
    const handler = async (...args: any[]) => {
      const eggObj = await getOrCreateEggObject(controllerProto, controllerProto.name);
      const realObj = eggObj.obj;
      const realMethod = realObj[toolMeta.name];
      let newArgs: any[] = [];
      if (schema && toolMeta.detail) {
        newArgs[toolMeta.detail.index] = args[0];
        if (toolMeta.extra) {
          newArgs[toolMeta.extra] = args[1];
        }
      } else if (toolMeta.extra) {
        newArgs[toolMeta.extra] = args[0];
      }
      newArgs = [...newArgs, ...args];
      return Reflect.apply(realMethod, realObj, newArgs) as ReturnType<ToolCallback>;
    };
    this.server.registerTool(
      name,
      {
        description,
        inputSchema: schema,
      },
      handler,
    );
  }

  async mcpPromptRegister(
    getOrCreateEggObject: (proto: EggPrototype, name?: EggObjectName) => Promise<EggObject>,
    controllerProto: EggPrototype,
    promptMeta: MCPPromptMeta,
  ): Promise<void> {
    const controllerMeta = controllerProto.getMetaData(CONTROLLER_META_DATA) as MCPControllerMeta;
    const name: string = promptMeta.mcpName ?? promptMeta.name;
    const description: string | undefined = promptMeta.description;
    let schema: NonNullable<(typeof promptMeta)['detail']>['argsSchema'] | undefined;
    if (promptMeta.detail?.argsSchema) {
      schema = promptMeta.detail?.argsSchema;
    } else {
      schema = await this.loadSchema(controllerMeta, promptMeta);
    }
    const handler = async (...args: any[]) => {
      const eggObj = await getOrCreateEggObject(controllerProto, controllerProto.name);
      const realObj = eggObj.obj;
      const realMethod = realObj[promptMeta.name];
      let newArgs: any[] = [];
      if (schema && promptMeta.detail) {
        newArgs[promptMeta.detail.index] = args[0];
        if (promptMeta.extra) {
          newArgs[promptMeta.extra] = args[1];
        }
      } else if (promptMeta.extra) {
        newArgs[promptMeta.extra] = args[0];
      }
      newArgs = [...newArgs, ...args];
      return Reflect.apply(realMethod, realObj, newArgs) as ReturnType<PromptCallback>;
    };
    this.server.registerPrompt(
      name,
      {
        title: promptMeta.title,
        description,
        argsSchema: schema,
      },
      handler,
    );
  }
}
