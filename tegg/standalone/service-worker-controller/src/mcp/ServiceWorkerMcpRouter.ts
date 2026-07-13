import { CONTROLLER_META_DATA, type MCPControllerMeta } from '@eggjs/controller-decorator';
import {
  MCPServerHelper,
  MCP_ROUTER_NAME,
  type McpRouter,
  type McpServerRegistration,
} from '@eggjs/controller-runtime';
import { Inject, InnerObjectProto } from '@eggjs/tegg';
import { EggContainerFactory } from '@eggjs/tegg-runtime';
import { CONTROLLER_AOP_MIDDLEWARES } from '@eggjs/tegg-types';
import type { EggProtoImplClass, EggPrototype } from '@eggjs/tegg-types';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';

import type { FetchRouter } from '../http/FetchRouter.ts';
import type { ServiceWorkerFetchContext } from '../http/ServiceWorkerFetchContext.ts';
import type { MCPAuthHandler } from '../types.ts';
import type { AbstractControllerAdvice } from './AbstractControllerAdvice.ts';

type MCPMiddleware = (ctx: ServiceWorkerFetchContext, next: () => Promise<void>) => Promise<void>;

/**
 * The fetch host's MCP transport boundary: stateless streamable HTTP under
 * `/mcp[/name]/stream` (POST only). The service worker speaks Fetch natively,
 * so the SDK's web-standard transport handles Request/Response directly — no
 * node req/res bridging. In stateless mode the SDK forbids transport reuse, so
 * each request gets a fresh MCPServerHelper + transport built from the live
 * records the host-agnostic register collected.
 *
 * The register collects and calls {@link registerServer} once per server name;
 * the actual fetch routes are mounted lazily in {@link doRegister} (after every
 * load unit exists, so all controller protos — and their middlewares — are
 * present).
 */
@InnerObjectProto({ name: MCP_ROUTER_NAME })
export class ServiceWorkerMcpRouter implements McpRouter {
  @Inject()
  private readonly fetchRouter: FetchRouter;

  @Inject()
  private readonly mcpAuthHandler: MCPAuthHandler;

  #registrations: McpServerRegistration[] = [];
  #mounted = false;

  registerServer(reg: McpServerRegistration): void {
    this.#registrations.push(reg);
  }

  async doRegister(): Promise<void> {
    if (this.#mounted) {
      return;
    }
    this.#mounted = true;
    for (const reg of this.#registrations) {
      const name = reg.serverName === 'default' ? undefined : reg.serverName;
      this.mountServer(reg, name);
    }
  }

  /**
   * Build a fresh MCP server + transport for a single request. The SDK's
   * stateless transport is single-shot (reuse throws), so this runs per
   * request against the live records; registration is in-memory callback
   * wiring and the callbacks resolve egg objects lazily.
   */
  private async createServerTransport(
    reg: McpServerRegistration,
    helperFactory: () => MCPServerHelper,
  ): Promise<WebStandardStreamableHTTPServerTransport> {
    const mcpServerHelper = helperFactory();
    for (const tool of reg.tools) {
      await mcpServerHelper.mcpToolRegister(tool.getOrCreateEggObject, tool.proto, tool.meta);
    }
    for (const resource of reg.resources) {
      await mcpServerHelper.mcpResourceRegister(resource.getOrCreateEggObject, resource.proto, resource.meta);
    }
    for (const prompt of reg.prompts) {
      await mcpServerHelper.mcpPromptRegister(prompt.getOrCreateEggObject, prompt.proto, prompt.meta);
    }
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    await mcpServerHelper.server.connect(transport);
    return transport;
  }

  /**
   * Resolve the per-server middlewares from every controller proto that
   * contributed to this server: function-type middlewares from the controller
   * metadata plus AOP advice classes declared on the proto.
   */
  private buildMiddlewares(reg: McpServerRegistration): MCPMiddleware[] {
    const middlewares: MCPMiddleware[] = [];
    const seen = new Set<EggPrototype>();
    for (const record of [...reg.tools, ...reg.resources, ...reg.prompts]) {
      if (seen.has(record.proto)) {
        continue;
      }
      seen.add(record.proto);
      const metadata = record.proto.getMetaData(CONTROLLER_META_DATA) as MCPControllerMeta;
      // Function-type middlewares from MCPControllerMeta
      const classMiddlewares = metadata.middlewares ?? [];
      for (const mw of classMiddlewares) {
        middlewares.push(mw as unknown as MCPMiddleware);
      }
      // AOP-type middlewares from class metadata
      const aopMiddlewareClasses = (record.proto.getMetaData(CONTROLLER_AOP_MIDDLEWARES) ??
        []) as EggProtoImplClass<AbstractControllerAdvice>[];
      for (const clazz of aopMiddlewareClasses) {
        middlewares.push(async (ctx, next) => {
          const eggObj = await EggContainerFactory.getOrCreateEggObjectFromClazz(clazz);
          await (eggObj.obj as AbstractControllerAdvice).middleware(ctx, next);
        });
      }
    }
    return middlewares;
  }

  private mountServer(reg: McpServerRegistration, name?: string): void {
    const router = this.fetchRouter;
    const helperFactory = () =>
      new MCPServerHelper({
        name: reg.controllerMeta.name ?? `mcp-${reg.serverName}-server`,
        version: reg.controllerMeta.version ?? '1.0.0',
      });
    const middlewares = this.buildMiddlewares(reg);

    const postRouterFunc = router.post;
    const initHandler = async (ctx: ServiceWorkerFetchContext) => {
      const denied = await this.mcpAuthHandler.authenticate(ctx.event.request);
      if (denied) {
        ctx.response = denied;
        return;
      }
      const transport = await this.createServerTransport(reg, helperFactory);
      ctx.response = await transport.handleRequest(ctx.event.request);
    };

    const streamPath = `/mcp${name ? `/${name}` : ''}/stream`;
    const basePath = `/mcp${name ? `/${name}` : ''}`;
    const paths = [streamPath, basePath];
    for (const path of paths) {
      Reflect.apply(postRouterFunc, router, ['mcpStatelessStreamInit', path, ...middlewares, initHandler]);
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
    const getRouterFunc = router.get;
    const delRouterFunc = router.del;
    for (const path of paths) {
      Reflect.apply(getRouterFunc, router, ['mcpStatelessStreamNotAllowed', path, notAllowedHandler]);
      Reflect.apply(delRouterFunc, router, ['mcpStatelessStreamNotAllowed', path, notAllowedHandler]);
    }
  }
}
