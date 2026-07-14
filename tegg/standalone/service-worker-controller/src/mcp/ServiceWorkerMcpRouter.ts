import { CONTROLLER_META_DATA, type MCPControllerMeta, type MCPToolMeta } from '@eggjs/controller-decorator';
import {
  MCPServerHelper,
  MCP_ROUTER_NAME,
  type McpRouter,
  type McpServerRegistration,
  type ServerRegisterRecord,
} from '@eggjs/controller-runtime';
import { Inject, InjectOptional, InnerObjectProto } from '@eggjs/tegg';
import { EggContainerFactory } from '@eggjs/tegg-runtime';
import { CONTROLLER_AOP_MIDDLEWARES, TeggScope } from '@eggjs/tegg-types';
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

const MCP_TRANSPORTS_SLOT = Symbol('tegg:service-worker:mcpTransportProviders');

/** The built-in transport name (web-standard streamable HTTP); the default when
 * `config.mcp.transport` is unset. */
export const MCP_BUILTIN_TRANSPORT = 'web';

/**
 * The context an MCP transport provider receives for one server — everything it
 * needs to mount its own fetch routes without reaching into the router's
 * internals. A provider fully OWNS the transport for the server it mounts (the
 * built-in web-standard provider and any registered alternative are mutually
 * exclusive, selected by `config.mcp.transport`).
 */
export interface McpServerMountContext {
  /** The fetch router to mount transport routes on. */
  readonly router: FetchRouter;
  /** The live collected records for this MCP server. */
  readonly registration: McpServerRegistration;
  /** undefined for the default (unnamed) server; the multiple-server name otherwise. */
  readonly serverName: string | undefined;
  /** `/mcp` for the default server, `/mcp/<name>` otherwise. */
  readonly basePath: string;
  /** The outermost auth gate; returns a denial Response, or undefined to allow. */
  authenticate(request: Request): Promise<Response | undefined>;
  /** Build a fresh MCPServerHelper with this server's tools/resources/prompts registered. */
  createServerHelper(): Promise<MCPServerHelper>;
  /** Controller + method AOP middlewares selected for a parsed JSON-RPC body. */
  selectMiddlewares(parsedBody: unknown): MCPMiddleware[];
  /** Compose middlewares koa-style around a terminal dispatch. */
  compose(middlewares: MCPMiddleware[]): (ctx: ServiceWorkerFetchContext) => Promise<void>;
}

/**
 * A host-provided MCP transport, registered by name via
 * {@link ServiceWorkerMcpRouter.registerTransport} and selected per app through
 * `config.mcp.transport`. Lets a host swap in a transport the edge-clean core
 * omits (e.g. a node-mock SSE + streamable transport) without forking the
 * router; node:http stays entirely in the host that registers it.
 */
export interface McpTransportProvider {
  mount(context: McpServerMountContext): void;
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
  // Per-app named transport providers (scope-backed so concurrent apps do not
  // accumulate each other's). A host registers an alternative transport during
  // boot; `config.mcp.transport` selects which one mounts per server (default is
  // the built-in web-standard). Static so a host can register before any router
  // instance exists.
  static get transports(): Map<string, McpTransportProvider> {
    return TeggScope.resolve(MCP_TRANSPORTS_SLOT, () => new Map(), 'ServiceWorkerMcpRouter.transports');
  }

  static registerTransport(name: string, provider: McpTransportProvider): void {
    ServiceWorkerMcpRouter.transports.set(name, provider);
  }

  @Inject()
  private readonly fetchRouter: FetchRouter;

  // Optional MCP auth gate; when no host provides one, every request is allowed
  // (same optional-capability pattern as fetchContextFactory/errorResponseMapper).
  @InjectOptional()
  private readonly mcpAuthHandler?: MCPAuthHandler;

  // The app-wide config inner object (the app's module.yml); MCP transport
  // options live under its `mcp` key.
  @Inject()
  private readonly config: { mcp?: MCPTransportOptions };

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
   * Build a fresh MCPServerHelper for one server with its tool/resource/prompt
   * records registered. The SDK's stateless transport is single-shot (reuse
   * throws), so this runs per request against the live records; registration is
   * in-memory callback wiring and the callbacks resolve egg objects lazily.
   * Shared by the built-in streamable transport and any additional mounter.
   */
  async #createServerHelper(reg: McpServerRegistration): Promise<MCPServerHelper> {
    const mcpServerHelper = new MCPServerHelper({
      name: reg.controllerMeta.name ?? `mcp-${reg.serverName}-server`,
      version: reg.controllerMeta.version ?? '1.0.0',
    });
    for (const tool of reg.tools) {
      await mcpServerHelper.mcpToolRegister(tool.getOrCreateEggObject, tool.proto, tool.meta);
    }
    for (const resource of reg.resources) {
      await mcpServerHelper.mcpResourceRegister(resource.getOrCreateEggObject, resource.proto, resource.meta);
    }
    for (const prompt of reg.prompts) {
      await mcpServerHelper.mcpPromptRegister(prompt.getOrCreateEggObject, prompt.proto, prompt.meta);
    }
    return mcpServerHelper;
  }

  /** Run the optional auth gate; absent handler → allowed (undefined). */
  #authenticate(request: Request): Promise<Response | undefined> {
    return this.mcpAuthHandler?.authenticate(request) ?? Promise.resolve(undefined);
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
    const { allowedHosts, allowedOrigins, enableDnsRebindingProtection } = this.config?.mcp ?? {};
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
    // `config.mcp.transport` selects the transport per app: the built-in
    // web-standard streamable (default), or a host-registered alternative (e.g.
    // node-mock SSE + streamable). An unknown name falls back to the built-in.
    const transportName = this.config?.mcp?.transport ?? MCP_BUILTIN_TRANSPORT;
    const provider =
      transportName === MCP_BUILTIN_TRANSPORT ? undefined : ServiceWorkerMcpRouter.transports.get(transportName);
    if (provider) {
      provider.mount(this.#createMountContext(reg, name));
      return;
    }
    this.#mountStreamable(reg, name);
  }

  /**
   * The built-in transport: stateless web-standard streamable HTTP (POST only)
   * under `/mcp[/name]/stream` and `/mcp[/name]`.
   */
  #mountStreamable(reg: McpServerRegistration, name?: string): void {
    const router = this.fetchRouter;
    const postRouterFunc = router.post;
    const initHandler = async (ctx: ServiceWorkerFetchContext) => {
      const request = ctx.event.request;
      // Parse the body first (via a clone, no side effect) so target selection
      // and the SDK share one read; authentication remains the outermost gate
      // before any middleware or transport dispatch runs.
      const parsedBody = await this.#readJsonRpcBody(request);
      const denied = await this.#authenticate(request);
      if (denied) {
        ctx.response = denied;
        return;
      }
      const options: HandleRequestOptions | undefined = parsedBody === undefined ? undefined : { parsedBody };
      const dispatch: MCPMiddleware = async () => {
        const helper = await this.#createServerHelper(reg);
        const transport = new WebStandardStreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
          ...this.#dnsRebindingOptions(),
        });
        await helper.server.connect(transport);
        ctx.response = await transport.handleRequest(request, options);
      };
      await composeMiddlewares([...this.#selectMiddlewares(reg, parsedBody), dispatch])(ctx);
    };

    const basePath = `/mcp${name ? `/${name}` : ''}`;
    const paths = [`${basePath}/stream`, basePath];
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

  /** The context handed to each additional {@link McpServerMounter}. */
  #createMountContext(reg: McpServerRegistration, name?: string): McpServerMountContext {
    return {
      router: this.fetchRouter,
      registration: reg,
      serverName: name,
      basePath: `/mcp${name ? `/${name}` : ''}`,
      authenticate: (request) => this.#authenticate(request),
      createServerHelper: () => this.#createServerHelper(reg),
      selectMiddlewares: (parsedBody) => this.#selectMiddlewares(reg, parsedBody),
      compose: (middlewares) => composeMiddlewares(middlewares),
    };
  }
}
