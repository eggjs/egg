import type { MCPControllerMeta, MCPPromptMeta, MCPResourceMeta, MCPToolMeta } from '@eggjs/controller-decorator';
import type { EggContainerFactory } from '@eggjs/tegg-runtime';
import { CONTROLLER_META_DATA } from '@eggjs/tegg-types';
import type { EggPrototype } from '@eggjs/tegg-types';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ReadResourceCallback, ToolCallback, PromptCallback } from '@modelcontextprotocol/sdk/server/mcp.js';

import { executeControllerAdvices } from '../../ControllerAdvice.ts';

/** Allows a host to supply tool or prompt schemas missing from metadata. */
export interface MCPSchemaLoaderHook {
  schemaLoader?: (
    controllerMeta: MCPControllerMeta,
    meta: MCPPromptMeta | MCPToolMeta,
  ) => Promise<Parameters<McpServer['tool']>['2'] | undefined>;
}

export interface MCPServerHelperOptions {
  name: string;
  version: string;
  eggContainerFactory: typeof EggContainerFactory;
  getControllerContext?: () => unknown;
  /** The host wraps controller-level Advice around transport dispatch. */
  controllerAdvicesHandledByHost?: boolean;
  hooks?: readonly MCPSchemaLoaderHook[];
}

export class MCPServerHelper {
  server: McpServer;
  hooks: readonly MCPSchemaLoaderHook[];
  private readonly eggContainerFactory: typeof EggContainerFactory;
  private readonly getControllerContext?: () => unknown;
  private readonly controllerAdvicesHandledByHost: boolean;

  constructor(opts: MCPServerHelperOptions) {
    this.server = new McpServer(
      {
        name: opts.name,
        version: opts.version,
      },
      { capabilities: { logging: {} } },
    );
    this.eggContainerFactory = opts.eggContainerFactory;
    this.getControllerContext = opts.getControllerContext;
    this.controllerAdvicesHandledByHost = opts.controllerAdvicesHandledByHost ?? false;
    this.hooks = opts.hooks ?? [];
  }

  private invokeControllerAdvices(
    controllerMeta: MCPControllerMeta,
    methodMeta: MCPPromptMeta | MCPResourceMeta | MCPToolMeta,
    that: object,
    args: any[],
    invoke: (that: object, args: any[]) => Promise<unknown>,
  ): Promise<unknown> {
    const advices = controllerMeta.getMethodAdvices(methodMeta, !this.controllerAdvicesHandledByHost);
    if (advices.length === 0) {
      return invoke(that, args);
    }
    const controllerContext = this.getControllerContext?.();
    if (controllerContext === undefined) {
      throw new Error(
        `Controller context is required to execute Advice middleware for ${controllerMeta.controllerName}.${methodMeta.name}`,
      );
    }
    return executeControllerAdvices(
      controllerContext,
      that,
      methodMeta.name,
      args,
      advices,
      this.eggContainerFactory,
      invoke,
    );
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

  async mcpResourceRegister(controllerProto: EggPrototype, resourceMeta: MCPResourceMeta): Promise<void> {
    const controllerMeta = controllerProto.getMetaData(CONTROLLER_META_DATA) as MCPControllerMeta;
    const handler = async (...args: any[]) => {
      const eggObj = await this.eggContainerFactory.getOrCreateEggObject(controllerProto, controllerProto.name);
      const realObj = eggObj.obj;
      const realMethod = realObj[resourceMeta.name];
      return this.invokeControllerAdvices(
        controllerMeta,
        resourceMeta,
        realObj,
        args,
        async (invocationThat, invocationArgs) => Reflect.apply(realMethod, invocationThat, invocationArgs),
      ) as ReturnType<ReadResourceCallback>;
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

  async mcpToolRegister(controllerProto: EggPrototype, toolMeta: MCPToolMeta): Promise<void> {
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
      const eggObj = await this.eggContainerFactory.getOrCreateEggObject(controllerProto, controllerProto.name);
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
      return this.invokeControllerAdvices(
        controllerMeta,
        toolMeta,
        realObj,
        newArgs,
        async (invocationThat, invocationArgs) => Reflect.apply(realMethod, invocationThat, invocationArgs),
      ) as ReturnType<ToolCallback>;
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

  async mcpPromptRegister(controllerProto: EggPrototype, promptMeta: MCPPromptMeta): Promise<void> {
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
      const eggObj = await this.eggContainerFactory.getOrCreateEggObject(controllerProto, controllerProto.name);
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
      return this.invokeControllerAdvices(
        controllerMeta,
        promptMeta,
        realObj,
        newArgs,
        async (invocationThat, invocationArgs) => Reflect.apply(realMethod, invocationThat, invocationArgs),
      ) as ReturnType<PromptCallback>;
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
