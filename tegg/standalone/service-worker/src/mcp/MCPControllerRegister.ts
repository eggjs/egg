import {
  CONTROLLER_META_DATA,
  type MCPControllerMeta,
  type MCPPromptMeta,
  type MCPResourceMeta,
  type MCPToolMeta,
} from '@eggjs/controller-decorator';
import { type ControllerRegister, MCPServerHelper } from '@eggjs/controller-plugin';
import type { Router } from '@eggjs/router';
import { EggContainerFactory } from '@eggjs/tegg-runtime';
import type { EggObject, EggObjectName, EggProtoImplClass, EggPrototype } from '@eggjs/tegg-types';
import { CONTROLLER_AOP_MIDDLEWARES } from '@eggjs/tegg-types';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';

import type { ServiceWorkerFetchContext } from '../http/ServiceWorkerFetchContext.ts';
import type { MCPAuthHandler } from '../types.ts';
import type { AbstractControllerAdvice } from './AbstractControllerAdvice.ts';

interface ServerRegisterRecord<T> {
  getOrCreateEggObject: (proto: EggPrototype, name?: EggObjectName) => Promise<EggObject>;
  proto: EggPrototype;
  meta: T;
}

type MCPMiddleware = (ctx: ServiceWorkerFetchContext, next: () => Promise<void>) => Promise<void>;

/**
 * The fetch host's MCP transport/register: stateless streamable HTTP under
 * `/mcp[/name]/stream` (POST only). The service worker speaks Fetch natively,
 * so the SDK's web-standard transport handles Request/Response directly —
 * no node req/res bridging. In stateless mode the SDK forbids transport
 * reuse, so each request gets a fresh MCPServerHelper + transport built
 * from the register records collected at boot. Tool/prompt/resource wiring
 * goes through the shared MCPServerHelper.
 */
export class MCPControllerRegister implements ControllerRegister {
  private readonly router: Router;
  private readonly authHandler: MCPAuthHandler;
  private controllerProtos: EggPrototype[] = [];
  private registeredControllerProtos: EggPrototype[] = [];
  private readonly controllerMeta: MCPControllerMeta;
  mcpServerHelperMap: Record<string, () => MCPServerHelper> = {};
  middlewaresMap: Record<string, MCPMiddleware[]> = {};
  registerMap: Record<
    string,
    {
      tools: ServerRegisterRecord<MCPToolMeta>[];
      prompts: ServerRegisterRecord<MCPPromptMeta>[];
      resources: ServerRegisterRecord<MCPResourceMeta>[];
    }
  > = {};

  constructor(controllerMeta: MCPControllerMeta, router: Router, authHandler: MCPAuthHandler) {
    this.router = router;
    this.controllerMeta = controllerMeta;
    this.authHandler = authHandler;
  }

  addControllerProto(proto: EggPrototype): void {
    this.controllerProtos.push(proto);
  }

  /**
   * Build a fresh MCP server + transport for a single request. The SDK's
   * stateless transport is single-shot (reuse throws), so this runs per
   * request against the register records collected at boot; registration is
   * in-memory callback wiring and the callbacks resolve egg objects lazily.
   */
  private async createServerTransport(name?: string): Promise<WebStandardStreamableHTTPServerTransport> {
    const mcpServerHelper = this.mcpServerHelperMap[name ?? 'default']();
    const registerEntry = this.registerMap[name ?? 'default'];
    if (registerEntry) {
      for (const tool of registerEntry.tools) {
        await mcpServerHelper.mcpToolRegister(tool.getOrCreateEggObject, tool.proto, tool.meta);
      }
      for (const resource of registerEntry.resources) {
        await mcpServerHelper.mcpResourceRegister(resource.getOrCreateEggObject, resource.proto, resource.meta);
      }
      for (const prompt of registerEntry.prompts) {
        await mcpServerHelper.mcpPromptRegister(prompt.getOrCreateEggObject, prompt.proto, prompt.meta);
      }
    }
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    await mcpServerHelper.server.connect(transport);
    return transport;
  }

  private mcpStatelessStreamServerInit(name?: string): void {
    const postRouterFunc = this.router.post;
    const initHandler = async (ctx: ServiceWorkerFetchContext) => {
      const denied = await this.authHandler.authenticate(ctx.event.request);
      if (denied) {
        ctx.response = denied;
        return;
      }
      const transport = await this.createServerTransport(name);
      ctx.response = await transport.handleRequest(ctx.event.request);
    };

    const streamPath = `/mcp${name ? `/${name}` : ''}/stream`;
    const basePath = `/mcp${name ? `/${name}` : ''}`;
    const middlewares = this.middlewaresMap[name ?? 'default'] ?? [];
    const paths = [streamPath, basePath];
    for (const path of paths) {
      Reflect.apply(postRouterFunc, this.router, ['mcpStatelessStreamInit', path, ...middlewares, initHandler]);
    }

    // Only POST is allowed for stateless streamable HTTP
    const notAllowedHandler = async (ctx: ServiceWorkerFetchContext) => {
      ctx.response = new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Method not allowed.',
          },
          id: null,
        }),
        {
          status: 405,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    };
    const getRouterFunc = this.router.get;
    const delRouterFunc = this.router.del;
    for (const path of paths) {
      Reflect.apply(getRouterFunc, this.router, ['mcpStatelessStreamNotAllowed', path, notAllowedHandler]);
      Reflect.apply(delRouterFunc, this.router, ['mcpStatelessStreamNotAllowed', path, notAllowedHandler]);
    }
  }

  async register(): Promise<void> {
    for (const proto of this.controllerProtos) {
      if (this.registeredControllerProtos.includes(proto)) {
        continue;
      }
      const metadata = proto.getMetaData(CONTROLLER_META_DATA) as MCPControllerMeta;
      const serverName = metadata.name ?? 'default';
      this.mcpServerHelperMap[serverName] ??= () => {
        return new MCPServerHelper({
          name: this.controllerMeta.name ?? `mcp-${serverName}-server`,
          version: this.controllerMeta.version ?? '1.0.0',
        });
      };
      this.registerMap[serverName] ??= {
        prompts: [],
        resources: [],
        tools: [],
      };
      for (const tool of metadata.tools) {
        this.registerMap[serverName].tools.push({
          getOrCreateEggObject: EggContainerFactory.getOrCreateEggObject.bind(EggContainerFactory),
          proto,
          meta: tool,
        });
      }
      for (const resource of metadata.resources) {
        this.registerMap[serverName].resources.push({
          getOrCreateEggObject: EggContainerFactory.getOrCreateEggObject.bind(EggContainerFactory),
          proto,
          meta: resource,
        });
      }
      for (const prompt of metadata.prompts) {
        this.registerMap[serverName].prompts.push({
          getOrCreateEggObject: EggContainerFactory.getOrCreateEggObject.bind(EggContainerFactory),
          proto,
          meta: prompt,
        });
      }

      this.middlewaresMap[serverName] ??= [];

      // Function-type middlewares from MCPControllerMeta
      const classMiddlewares = metadata.middlewares ?? [];
      for (const mw of classMiddlewares) {
        this.middlewaresMap[serverName].push(mw as unknown as MCPMiddleware);
      }

      // AOP-type middlewares from class metadata
      const aopMiddlewareClasses = (proto.getMetaData(CONTROLLER_AOP_MIDDLEWARES) ??
        []) as EggProtoImplClass<AbstractControllerAdvice>[];
      for (const clazz of aopMiddlewareClasses) {
        this.middlewaresMap[serverName].push(async (ctx, next) => {
          const eggObj = await EggContainerFactory.getOrCreateEggObjectFromClazz(clazz);
          await (eggObj.obj as AbstractControllerAdvice).middleware(ctx, next);
        });
      }

      this.registeredControllerProtos.push(proto);
    }
  }

  async doRegister(): Promise<void> {
    // Initialize MCP routes for each server name
    const names = Object.keys(this.registerMap);
    for (const name of names) {
      this.mcpStatelessStreamServerInit(name === 'default' ? undefined : name);
    }
  }
}
