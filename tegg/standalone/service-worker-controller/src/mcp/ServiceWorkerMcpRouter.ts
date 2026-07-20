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

/** Compose selected middleware around one MCP dispatch. */
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

/** Built-in web-standard Streamable HTTP transport. */
export const MCP_BUILTIN_TRANSPORT = 'web';

/** Capabilities available to a custom MCP transport provider. */
export interface McpServerMountContext {
  /** The fetch router to mount transport routes on. */
  readonly router: FetchRouter;
  /** All controller records for this MCP server. */
  readonly registration: McpServerRegistration;
  /** Undefined for the default server. */
  readonly serverName: string | undefined;
  /** `/mcp` for the default server, `/mcp/<name>` otherwise. */
  readonly basePath: string;
  /** Return a denial response, or undefined to allow the request. */
  authenticate(request: Request): Promise<Response | undefined>;
  /** Create a server helper with this registration's methods. */
  createServerHelper(): Promise<MCPServerHelper>;
  /** Controller + method AOP middlewares selected for a parsed JSON-RPC body. */
  selectMiddlewares(parsedBody: unknown): MCPMiddleware[];
  /** Compose middlewares koa-style around a terminal dispatch. */
  compose(middlewares: MCPMiddleware[]): (ctx: ServiceWorkerFetchContext) => Promise<void>;
}

/** Mounts a custom transport instead of the built-in transport. */
export interface McpTransportProvider {
  mount(context: McpServerMountContext): void;
}

/** Mounts fetch-native MCP transports for collected controller registrations. */
@InnerObjectProto({ name: MCP_ROUTER_NAME })
export class ServiceWorkerMcpRouter implements McpRouter {
  // Scope-backed so providers can be registered before the router is constructed.
  static get transports(): Map<string, McpTransportProvider> {
    return TeggScope.resolve(MCP_TRANSPORTS_SLOT, () => new Map(), 'ServiceWorkerMcpRouter.transports');
  }

  static registerTransport(name: string, provider: McpTransportProvider): void {
    ServiceWorkerMcpRouter.transports.set(name, provider);
  }

  @Inject()
  private readonly fetchRouter: FetchRouter;

  // Missing authentication handlers allow the request.
  @InjectOptional()
  private readonly mcpAuthHandler?: MCPAuthHandler;

  @Inject()
  private readonly config: { mcp?: MCPTransportOptions };

  registerServer(reg: McpServerRegistration): void {
    const name = reg.serverName === 'default' ? undefined : reg.serverName;
    this.mountServer(reg, name);
  }

  /** Create the request-scoped MCP server required by stateless transport. */
  async #createServerHelper(reg: McpServerRegistration): Promise<MCPServerHelper> {
    const mcpServerHelper = new MCPServerHelper({
      name: reg.controllerMeta.name ?? `mcp-${reg.serverName}-server`,
      version: reg.controllerMeta.version ?? '1.0.0',
      eggContainerFactory: EggContainerFactory,
    });
    for (const tool of reg.tools) {
      await mcpServerHelper.mcpToolRegister(tool.proto, tool.meta);
    }
    for (const resource of reg.resources) {
      await mcpServerHelper.mcpResourceRegister(resource.proto, resource.meta);
    }
    for (const prompt of reg.prompts) {
      await mcpServerHelper.mcpPromptRegister(prompt.proto, prompt.meta);
    }
    return mcpServerHelper;
  }

  /** Run the optional authentication gate. */
  #authenticate(request: Request): Promise<Response | undefined> {
    return this.mcpAuthHandler?.authenticate(request) ?? Promise.resolve(undefined);
  }

  /** Enable SDK DNS-rebinding checks when an allow-list is configured. */
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

  /** Parse a clone so the SDK can reuse the body even if authentication consumes it. */
  async #readJsonRpcBody(request: Request): Promise<unknown> {
    try {
      return await request.clone().json();
    } catch {
      // Let the SDK report malformed or empty bodies.
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
        return undefined;
    }
  }

  /** Return controller-level middleware for a prototype. */
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

  /** Select middleware for the methods targeted by a JSON-RPC body. */
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
    // Unknown provider names fall back to the built-in transport.
    const transportName = this.config?.mcp?.transport ?? MCP_BUILTIN_TRANSPORT;
    const provider =
      transportName === MCP_BUILTIN_TRANSPORT ? undefined : ServiceWorkerMcpRouter.transports.get(transportName);
    if (provider) {
      provider.mount(this.#createMountContext(reg, name));
      return;
    }
    this.#mountStreamable(reg, name);
  }

  /** Mount the built-in stateless Streamable HTTP routes. */
  #mountStreamable(reg: McpServerRegistration, name?: string): void {
    const router = this.fetchRouter;
    const postRouterFunc = router.post;
    const initHandler = async (ctx: ServiceWorkerFetchContext) => {
      const request = ctx.event.request;
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

  /** Build the context passed to a {@link McpTransportProvider}. */
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
