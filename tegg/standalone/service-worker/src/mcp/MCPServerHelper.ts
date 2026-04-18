import {
  McpServer,
  ReadResourceCallback,
  ToolCallback,
  PromptCallback,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { CONTROLLER_META_DATA } from '@eggjs/tegg';
import type { EggObject, EggObjectName, EggPrototype } from '@eggjs/tegg-types';
import { MCPControllerMeta, MCPPromptMeta, MCPResourceMeta, MCPToolMeta } from '@eggjs/tegg';

export interface MCPServerHelperOptions {
  name: string;
  version: string;
}

export class MCPServerHelper {
  server: McpServer;

  constructor(opts: MCPServerHelperOptions) {
    this.server = new McpServer(
      {
        name: opts.name,
        version: opts.version,
      },
      { capabilities: { logging: {} } },
    );
  }

  async mcpResourceRegister(
    getOrCreateEggObject: (proto: EggPrototype, name?: EggObjectName) => Promise<EggObject>,
    controllerProto: EggPrototype,
    resourceMeta: MCPResourceMeta,
  ) {
    const handler = async (...args) => {
      const eggObj = await getOrCreateEggObject(
        controllerProto,
        controllerProto.name,
      );
      const realObj = eggObj.obj;
      const realMethod = realObj[resourceMeta.name];
      return Reflect.apply(
        realMethod,
        realObj,
        args,
      ) as ReturnType<ReadResourceCallback>;
    };
    const name = resourceMeta.mcpName ?? resourceMeta.name;
    if (resourceMeta.uri) {
      this.server.registerResource(name, resourceMeta.uri, resourceMeta.metadata ?? {}, handler);
    } else if (resourceMeta.template) {
      this.server.registerResource(name, resourceMeta.template as unknown as any, resourceMeta.metadata ?? {}, handler);
    } else {
      throw new Error(`MCPResource ${name} must have uri or template`);
    }
  }

  async mcpToolRegister(
    getOrCreateEggObject: (proto: EggPrototype, name?: EggObjectName) => Promise<EggObject>,
    controllerProto: EggPrototype,
    toolMeta: MCPToolMeta,
  ) {
    const controllerMeta = controllerProto.getMetaData(
      CONTROLLER_META_DATA,
    ) as MCPControllerMeta;
    void controllerMeta;
    const name: string = toolMeta.mcpName ?? toolMeta.name;
    const description: string | undefined = toolMeta.description;
    let schema: NonNullable<typeof toolMeta['detail']>['argsSchema'] | undefined;
    if (toolMeta.detail?.argsSchema) {
      schema = toolMeta.detail?.argsSchema;
    }
    const handler = async (...args) => {
      const eggObj = await getOrCreateEggObject(
        controllerProto,
        controllerProto.name,
      );
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
      newArgs = [ ...newArgs, ...args ];
      return Reflect.apply(realMethod, realObj, newArgs) as ReturnType<ToolCallback>;
    };
    this.server.registerTool(name, {
      description,
      inputSchema: schema,
    }, handler);
  }

  async mcpPromptRegister(
    getOrCreateEggObject: (proto: EggPrototype, name?: EggObjectName) => Promise<EggObject>,
    controllerProto: EggPrototype,
    promptMeta: MCPPromptMeta,
  ) {
    const name: string = promptMeta.mcpName ?? promptMeta.name;
    const description: string | undefined = promptMeta.description;
    let schema: NonNullable<typeof promptMeta['detail']>['argsSchema'] | undefined;
    if (promptMeta.detail?.argsSchema) {
      schema = promptMeta.detail?.argsSchema;
    }
    const handler = async (...args) => {
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
      newArgs = [ ...newArgs, ...args ];
      return Reflect.apply(realMethod, realObj, newArgs) as ReturnType<PromptCallback>;
    };
    this.server.registerPrompt(name, {
      title: promptMeta.title,
      description,
      argsSchema: schema,
    }, handler);
  }
}
