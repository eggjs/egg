import { CONTROLLER_META_DATA, type MCPControllerMeta, type MCPToolMeta } from '@eggjs/controller-decorator';
import {
  MCPServerHelper,
  MCP_ROUTER_NAME,
  type McpRouter,
  type McpServerRegistration,
  type ServerRegisterRecord,
} from '@eggjs/controller-runtime';
import { Inject, InnerObjectProto } from '@eggjs/tegg';
import { EggContainerFactory } from '@eggjs/tegg-runtime';
import { CONTROLLER_AOP_MIDDLEWARES } from '@eggjs/tegg-types';
import type { EggProtoImplClass, EggPrototype } from '@eggjs/tegg-types';
import {
  type HandleRequestOptions,
  WebStandardStreamableHTTPServerTransport,
} from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';

import type { FetchRouter } from '../http/FetchRouter.ts';
import type { ServiceWorkerFetchContext } from '../http/ServiceWorkerFetchContext.ts';
import type { MCPAuthHandler, MCPTransportOptions } from '../types.ts';
import type { AbstractControllerAdvice } from './AbstractControllerAdvice.ts';

type MCPMiddleware = (ctx: ServiceWorkerFetchContext, next: () => Promise<void>) => Promise<void>;

/** Minimal koa-style onion compose so selected middlewares wrap the dispatch. */
function composeMiddlewares(middlewares: MCPMiddleware[]): (ctx: ServiceWorkerFetchContext) => Promise<void> {
  return (ctx) => {
    let index = -1;
    const dispatch = (i: number): Promise<void> => {
      if (i <= index) {
        return Promise.reject(new Error('next() called multiple times'));
      }
      index = i;
      const fn = middlewares[i];
      if (!fn) {
        return Promise.resolve();
      }
      return Promise.resolve(fn(ctx, () => dispatch(i + 1)));
    };
    return dispatch(0);
  };
}

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

  @Inject()
  private readonly mcpTransportOptions: MCPTransportOptions;

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
      ...this.#dnsRebindingOptions(),
    });
    await mcpServerHelper.server.connect(transport);
    return transport;
  }

  /**
   * Forward Host/Origin allow-lists to the SDK transport. Protection turns on
   * once either list is configured (default off for backward compatibility) —
   * the host should set it before exposing the endpoint beyond loopback.
   */
  #dnsRebindingOptions(): {
    allowedHosts?: string[];
    allowedOrigins?: string[];
    enableDnsRebindingProtection?: boolean;
  } {
    const { allowedHosts, allowedOrigins, enableDnsRebindingProtection } = this.mcpTransportOptions ?? {};
    if (!allowedHosts?.length && !allowedOrigins?.length) {
      return {};
    }
    return {
      allowedHosts,
      allowedOrigins,
      enableDnsRebindingProtection: enableDnsRebindingProtection ?? true,
    };
  }

  /** Read the JSON-RPC body once via a clone; the original stream stays intact
   * for the SDK / a middleware, and the parsed value is handed to the SDK so it
   * never re-reads the one-shot body after auth or a middleware touched it. */
  async #readJsonRpcBody(request: Request): Promise<unknown> {
    try {
      return await request.clone().json();
    } catch {
      // Empty / non-JSON: let the SDK read the original and raise its own error.
      return undefined;
    }
  }

  /** Find the tool/prompt/resource a JSON-RPC message targets, if any. */
  #findTargetRecord(
    reg: McpServerRegistration,
    message: unknown,
  ): ServerRegisterRecord<{ name?: string; mcpName?: string; uri?: string }> | undefined {
    const method = (message as { method?: string })?.method;
    const params = ((message as { params?: Record<string, unknown> })?.params ?? {}) as {
      name?: string;
      uri?: string;
    };
    switch (method) {
      case 'tools/call':
        return reg.tools.find((t) => (t.meta.mcpName ?? t.meta.name) === params.name);
      case 'prompts/get':
        return reg.prompts.find((p) => (p.meta.mcpName ?? p.meta.name) === params.name);
      case 'resources/read':
        return reg.resources.find((r) => r.meta.uri !== undefined && r.meta.uri === params.uri);
      default:
        // initialize / tools|prompts|resources/list / ping etc. target no record.
        return undefined;
    }
  }

  /** Controller-level (function + AOP advice) middlewares declared on a proto. */
  #controllerMiddlewares(proto: EggPrototype): MCPMiddleware[] {
    const out: MCPMiddleware[] = [];
    const metadata = proto.getMetaData(CONTROLLER_META_DATA) as MCPControllerMeta;
    for (const mw of metadata.middlewares ?? []) {
      out.push(mw as unknown as MCPMiddleware);
    }
    const aopMiddlewareClasses = (proto.getMetaData(CONTROLLER_AOP_MIDDLEWARES) ??
      []) as EggProtoImplClass<AbstractControllerAdvice>[];
    for (const clazz of aopMiddlewareClasses) {
      out.push(async (ctx, next) => {
        const eggObj = await EggContainerFactory.getOrCreateEggObjectFromClazz(clazz);
        await (eggObj.obj as AbstractControllerAdvice).middleware(ctx, next);
      });
    }
    return out;
  }

  /**
   * Select only the middlewares of the targeted tool/prompt/resource:
   * controller-level (once per owning proto) plus that method's own
   * middlewares. So one controller's middleware never runs for another
   * controller's tool, nor for `initialize` / `tools/list`.
   */
  #selectMiddlewares(reg: McpServerRegistration, parsedBody: unknown): MCPMiddleware[] {
    const messages = Array.isArray(parsedBody) ? parsedBody : [parsedBody];
    const middlewares: MCPMiddleware[] = [];
    const seenProtos = new Set<EggPrototype>();
    for (const message of messages) {
      const record = this.#findTargetRecord(reg, message);
      if (!record) {
        continue;
      }
      if (!seenProtos.has(record.proto)) {
        seenProtos.add(record.proto);
        middlewares.push(...this.#controllerMiddlewares(record.proto));
      }
      for (const mw of (record.meta as MCPToolMeta).middlewares ?? []) {
        middlewares.push(mw as unknown as MCPMiddleware);
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

    const postRouterFunc = router.post;
    const initHandler = async (ctx: ServiceWorkerFetchContext) => {
      const request = ctx.event.request;
      // Parse the body first (via a clone, no side effect) so target selection
      // and the SDK share one read; authentication remains the outermost gate
      // before any middleware or transport dispatch runs.
      const parsedBody = await this.#readJsonRpcBody(request);
      const denied = await this.mcpAuthHandler.authenticate(request);
      if (denied) {
        ctx.response = denied;
        return;
      }
      const options: HandleRequestOptions | undefined = parsedBody === undefined ? undefined : { parsedBody };
      const dispatch: MCPMiddleware = async () => {
        const transport = await this.createServerTransport(reg, helperFactory);
        ctx.response = await transport.handleRequest(request, options);
      };
      await composeMiddlewares([...this.#selectMiddlewares(reg, parsedBody), dispatch])(ctx);
    };

    const streamPath = `/mcp${name ? `/${name}` : ''}/stream`;
    const basePath = `/mcp${name ? `/${name}` : ''}`;
    const paths = [streamPath, basePath];
    for (const path of paths) {
      Reflect.apply(postRouterFunc, router, ['mcpStatelessStreamInit', path, initHandler]);
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
