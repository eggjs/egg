import http, { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';

import type { McpRouter, McpServerRegistration } from '@eggjs/controller-runtime';
import { MCPServerHelper } from '@eggjs/controller-runtime';
import { MCPProtocols } from '@eggjs/tegg';
import type { MCPControllerMeta, MCPPromptMeta, MCPToolMeta, EggContext } from '@eggjs/tegg';
import { TeggScope } from '@eggjs/tegg-types';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest, isJSONRPCRequest } from '@modelcontextprotocol/sdk/types.js';
import type { JSONRPCMessage, MessageExtraInfo } from '@modelcontextprotocol/sdk/types.js';
// @ts-expect-error await-event is not typed
import awaitEvent from 'await-event';
import contentType from 'content-type';
import type { Application, Context, Router } from 'egg';
import compose from 'koa-compose';
import getRawBody from 'raw-body';

import { MCPConfig } from './MCPConfig.ts';

const MCP_HOOKS_SLOT = Symbol('tegg:controller:mcpControllerHooks');

export interface MCPControllerHook {
  // SSE
  preSSEInitHandle?: (ctx: Context, transport: SSEServerTransport, router: EggMcpRouter) => Promise<void>;
  preHandleInitHandle?: (ctx: Context) => Promise<void>;

  // STREAM
  preHandle?: (ctx: Context) => Promise<void>;
  onStreamSessionInitialized?: (
    ctx: Context,
    transport: StreamableHTTPServerTransport,
    server: McpServer,
    router: EggMcpRouter,
  ) => Promise<void>;

  // COMMON
  preProxy?: (ctx: Context, proxyReq: http.IncomingMessage, proxyResp: http.ServerResponse) => Promise<void>;
  schemaLoader?: (
    controllerMeta: MCPControllerMeta,
    meta: MCPPromptMeta | MCPToolMeta,
  ) => Promise<Parameters<McpServer['tool']>['2']>;
  checkAndRunProxy?: (ctx: Context, type: MCPProtocols, sessionId: string) => Promise<boolean>;

  // middleware
  middlewareStart?: (ctx: Context) => Promise<void>;
  middlewareEnd?: (ctx: Context) => Promise<void>;
  middlewareError?: (ctx: Context, e: Error) => Promise<void>;
}

class InnerSSEServerTransport extends SSEServerTransport {
  // Capture the owning router so send() (driven by the MCP SDK, often
  // outside any ALS frame) resolves the correct app's request map directly.
  router?: EggMcpRouter;

  async send(message: JSONRPCMessage): Promise<void> {
    let err: null | Error = null;
    try {
      await super.send(message);
    } catch (e) {
      err = e as Error;
    } finally {
      const map = this.router?.sseTransportsRequestMap.get(this);
      if (map && 'id' in message) {
        const { resolve, reject } = map[message.id!] ?? {};
        if (resolve) {
          err ? reject(err) : resolve(null);
          delete map[String(message.id)];
        }
      }
    }
  }
}

/** Mounts the Egg MCP transports for collected controller registrations. */
export class EggMcpRouter implements McpRouter {
  // Scope-backed so hooks can be registered before the router is constructed.
  static get hooks(): MCPControllerHook[] {
    return TeggScope.resolve(MCP_HOOKS_SLOT, () => [], 'EggMcpRouter.hooks');
  }

  static addHook(hook: MCPControllerHook): void {
    EggMcpRouter.hooks.push(hook);
  }

  readonly app: Application;
  private readonly router: Router;
  mcpConfig: MCPConfig;

  transports: Record<string, InnerSSEServerTransport> = {};
  sseConnections: Map<string, { res: ServerResponse; intervalId: NodeJS.Timeout }> = new Map();
  mcpServerHelperMap: Record<string, () => MCPServerHelper> = {};
  mcpServerMap: Record<string, McpServer> = {};
  streamTransports: Record<string, StreamableHTTPServerTransport> = {};
  pingIntervals: Record<string, NodeJS.Timeout> = {};
  sseTransportsRequestMap: Map<
    InnerSSEServerTransport,
    Record<
      string,
      {
        resolve: (value: PromiseLike<null> | null) => void;
        reject: (reason?: any) => void;
      }
    >
  > = new Map();

  // Route handlers build request-specific MCP servers from these records.
  private registrations: Record<string, McpServerRegistration> = {};

  // Optional: resolved + composed lazily on the first request (see
  // `composeGlobalMiddleware`), so it stays undefined until then.
  globalMiddlewares?: compose.ComposedMiddleware<EggContext>;

  constructor(app: Application) {
    this.app = app;
    this.router = app.router;
    this.mcpConfig = new MCPConfig(app.config.mcp);
  }

  registerServer(reg: McpServerRegistration): void {
    const serverName = reg.serverName;
    // The unnamed server uses the base MCP paths.
    const name = serverName === 'default' ? undefined : serverName;
    this.registrations[serverName] = reg;
    this.mcpServerHelperMap[serverName] = () => {
      return new MCPServerHelper({
        name: reg.controllerMeta.name ?? `chair-mcp-${name ?? this.app.name}-server`,
        version: reg.controllerMeta.version ?? '1.0.0',
        eggContainerFactory: this.app.eggContainerFactory,
        hooks: EggMcpRouter.hooks,
      });
    };
    this.mcpStatelessStreamServerInit(name);
    this.mcpStreamServerInit(name);
    this.mcpServerInit(name);
    this.mcpServerRegister(name);
    if (name) {
      this.mcpConfig.setMultipleServerPath(this.app, name);
    }
  }

  mcpStatelessStreamServerInit(name?: string): void {
    const postRouterFunc = this.router.post;
    const self = this;
    const mw = self.composeGlobalMiddleware(() => (self.app.middleware as any).teggCtxLifecycleMiddleware());
    const initHandler = async (ctx: Context) => {
      // Create fresh transport and server per request
      // MCP SDK >= 1.26 requires stateless transports to be single-use
      const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      const mcpServerHelper = self.mcpServerHelperMap[name ?? 'default']();
      const registerEntry = self.registrations[name ?? 'default'];
      if (registerEntry) {
        for (const tool of registerEntry.tools) {
          await mcpServerHelper.mcpToolRegister(tool.proto, tool.meta);
        }
        for (const resource of registerEntry.resources) {
          await mcpServerHelper.mcpResourceRegister(resource.proto, resource.meta);
        }
        for (const prompt of registerEntry.prompts) {
          await mcpServerHelper.mcpPromptRegister(prompt.proto, prompt.meta);
        }
      }
      await mcpServerHelper.server.connect(transport);
      const onmessage = transport.onmessage;
      transport.onmessage = async (message: JSONRPCMessage, extra?: MessageExtraInfo) => {
        if (self.app.currentContext) {
          self.app.currentContext.mcpArg = message;
        }
        onmessage && (await onmessage(message, extra));
      };
      if (EggMcpRouter.hooks.length > 0) {
        for (const hook of EggMcpRouter.hooks) {
          await hook.preHandle?.(self.app.currentContext!);
        }
      }
      ctx.respond = false;
      ctx.set({
        'content-type': 'text/event-stream',
      });
      await ctx.app.ctxStorage.run(ctx, async () => {
        await mw(ctx, async () => {
          await transport.handleRequest(ctx.req, ctx.res);
          await awaitEvent(ctx.res, 'close');
        });
      });
      return;
    };
    Reflect.apply(postRouterFunc, this.router, [
      'chairMcpStatelessStreamInit',
      self.mcpConfig.getStatelessStreamPath(name),
      ...[],
      initHandler,
    ]);
    const getRouterFunc = this.router.get;
    const delRouterFunc = this.router.del;
    const notHandler = async (ctx: Context) => {
      ctx.status = 405;
      ctx.body = {
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Method not allowed.',
        },
        id: null,
      };
    };
    Reflect.apply(getRouterFunc, this.router, [
      'chairMcpStatelessStreamInit',
      self.mcpConfig.getStatelessStreamPath(name),
      ...[],
      notHandler,
    ]);
    Reflect.apply(delRouterFunc, this.router, [
      'chairMcpStatelessStreamInit',
      self.mcpConfig.getStatelessStreamPath(name),
      ...[],
      notHandler,
    ]);
  }

  mcpStreamServerInit(name?: string): void {
    const allRouterFunc = this.router.all;
    const self = this;
    const mw = self.composeGlobalMiddleware(() => (self.app.middleware as any).teggCtxLifecycleMiddleware());
    const initHandler = async (ctx: Context) => {
      ctx.respond = false;
      if (EggMcpRouter.hooks.length > 0) {
        for (const hook of EggMcpRouter.hooks) {
          await hook.preHandle?.(self.app.currentContext!);
        }
      }
      const sessionId = ctx.req.headers['mcp-session-id'] as string | undefined;
      if (!sessionId) {
        const ct = contentType.parse(ctx.req.headers['content-type'] || 'application/json');

        let body: any;

        try {
          const rawBody = await getRawBody(ctx.req, {
            limit: '4mb',
            encoding: ct.parameters.charset ?? 'utf-8',
          });

          body = JSON.parse(rawBody.toString());
        } catch (e: any) {
          ctx.status = 400;
          ctx.body = {
            jsonrpc: '2.0',
            error: {
              code: -32000,
              message: `Bad Request: body should is json, ${e.toString()}`,
            },
            id: null,
          };
          return;
        }

        if (isInitializeRequest(body)) {
          ctx.respond = false;
          const eventStore = this.mcpConfig.getEventStore();
          const mcpServerHelper = self.mcpServerHelperMap[name ?? 'default']();
          for (const tool of self.registrations[name ?? 'default'].tools) {
            await mcpServerHelper.mcpToolRegister(tool.proto, tool.meta);
          }
          for (const resource of self.registrations[name ?? 'default'].resources) {
            await mcpServerHelper.mcpResourceRegister(resource.proto, resource.meta);
          }
          for (const prompt of self.registrations[name ?? 'default'].prompts) {
            await mcpServerHelper.mcpPromptRegister(prompt.proto, prompt.meta);
          }
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => this.mcpConfig.getSessionIdGenerator(name)(ctx),
            eventStore,
            onsessioninitialized: async (sessionId) => {
              if (EggMcpRouter.hooks.length > 0) {
                for (const hook of EggMcpRouter.hooks) {
                  await hook.onStreamSessionInitialized?.(
                    self.app.currentContext!,
                    transport,
                    mcpServerHelper.server,
                    self,
                  );
                }
              }
              if (self.mcpConfig.getStreamPingEnabled(name)) {
                self.mcpServerPing(mcpServerHelper.server.server, sessionId, name);
              }
            },
          });

          ctx.set({
            'content-type': 'text/event-stream',
          });

          await mcpServerHelper.server.connect(transport);

          transport.onclose = async () => {
            if (transport.sessionId && self.pingIntervals[transport.sessionId]) {
              clearInterval(self.pingIntervals[transport.sessionId]);
              delete self.pingIntervals[transport.sessionId];
            }
          };

          const onmessage = transport.onmessage;

          transport.onmessage = async (message: JSONRPCMessage, extra?: MessageExtraInfo) => {
            if (self.app.currentContext) {
              self.app.currentContext.mcpArg = message;
            }
            onmessage && (await onmessage(message, extra));
          };

          await ctx.app.ctxStorage.run(ctx, async () => {
            await mw(ctx, async () => {
              await transport.handleRequest(ctx.req, ctx.res, body);
              await awaitEvent(ctx.res, 'close');
            });
          });
        } else {
          ctx.status = 400;
          ctx.body = {
            jsonrpc: '2.0',
            error: {
              code: -32000,
              message: 'Bad Request: No valid session ID provided',
            },
            id: null,
          };
          return;
        }
      } else if (sessionId) {
        const transport = self.streamTransports[sessionId];
        if (transport) {
          if (EggMcpRouter.hooks.length > 0) {
            for (const hook of EggMcpRouter.hooks) {
              await hook.preHandle?.(self.app.currentContext!);
            }
          }
          ctx.respond = false;
          ctx.set({
            'content-type': 'text/event-stream',
          });

          await ctx.app.ctxStorage.run(ctx, async () => {
            await mw(ctx, async () => {
              await transport.handleRequest(ctx.req, ctx.res);
              await awaitEvent(ctx.res, 'close');
            });
          });
          return;
        }
        if (EggMcpRouter.hooks.length > 0) {
          for (const hook of EggMcpRouter.hooks) {
            const checked = await hook.checkAndRunProxy?.(self.app.currentContext!, MCPProtocols.STREAM, sessionId);
            if (checked) {
              return;
            }
          }
        }
      }
      return;
    };
    Reflect.apply(allRouterFunc, this.router, [
      'chairMcpStreamInit',
      self.mcpConfig.getStreamPath(name),
      ...[],
      initHandler,
    ]);
  }

  mcpServerInit(name?: string): void {
    const routerFunc = this.router.get;
    const self = this;
    const initHandler = async (ctx: Context) => {
      const transport = new InnerSSEServerTransport(self.mcpConfig.getSseMessagePath(name), ctx.res);
      transport.router = self;
      const id = transport.sessionId;
      if (EggMcpRouter.hooks.length > 0) {
        for (const hook of EggMcpRouter.hooks) {
          await hook.preSSEInitHandle?.(self.app.currentContext!, transport, self);
        }
      }
      const intervalId = setInterval(() => {
        if (self.sseConnections.has(id) && !ctx.res.writableEnded) {
          ctx.res.write(': keepalive\n\n');
        } else {
          clearInterval(intervalId);
          self.sseConnections.delete(id);
        }
      }, self.mcpConfig.getSseHeartTime(name));
      self.sseConnections.set(id, { res: ctx.res, intervalId });
      self.transports[id] = transport;
      ctx.set({
        'content-type': 'text/event-stream',
      });
      ctx.respond = false;
      const mcpServerHelper = self.mcpServerHelperMap[name ?? 'default']();
      for (const tool of self.registrations[name ?? 'default'].tools) {
        mcpServerHelper.mcpToolRegister(tool.proto, tool.meta);
      }
      for (const resource of self.registrations[name ?? 'default'].resources) {
        mcpServerHelper.mcpResourceRegister(resource.proto, resource.meta);
      }
      for (const prompt of self.registrations[name ?? 'default'].prompts) {
        mcpServerHelper.mcpPromptRegister(prompt.proto, prompt.meta);
      }
      await mcpServerHelper.server.connect(transport);
      self.mcpServerMap[id] = mcpServerHelper.server;
      if (self.mcpConfig.getSsePingEnabled(name)) {
        self.mcpServerPing(mcpServerHelper.server.server, transport.sessionId, name);
      }
      return self.sseCtxStorageRun.bind(self)(ctx, transport, name);
    };
    Reflect.apply(routerFunc, this.router, ['chairMcpInit', self.mcpConfig.getSseInitPath(name), ...[], initHandler]);
  }

  sseCtxStorageRun(ctx: Context, transport: SSEServerTransport, name?: string): void {
    const self = this;
    const mw = self.composeGlobalMiddleware(() => (this.app.middleware as any).teggCtxLifecycleMiddleware());
    const closeFunc = transport.onclose;
    transport.onclose = () => {
      closeFunc?.();
      delete self.transports[transport.sessionId];
      delete self.mcpServerMap[transport.sessionId];
      if (transport.sessionId && self.pingIntervals[transport.sessionId]) {
        clearInterval(self.pingIntervals[transport.sessionId]);
        delete self.pingIntervals[transport.sessionId];
      }
      self.sseTransportsRequestMap.delete(transport as any);
      const connection = self.sseConnections.get(transport.sessionId);
      if (connection) {
        clearInterval(connection.intervalId);
        self.sseConnections.delete(transport.sessionId);
      }
    };
    transport.onerror = (error: Error) => {
      self.app.logger.error('session %s error %o', transport.sessionId, error);
    };
    const messageFunc = transport.onmessage;
    self.sseTransportsRequestMap.set(transport as any, {});
    transport.onmessage = async (message: JSONRPCMessage, extra?: MessageExtraInfo) => {
      const args = [message, extra];
      const socket = new Socket();
      const req = new IncomingMessage(socket);
      const res = new ServerResponse(req);
      req.method = 'POST';
      req.url = self.mcpConfig.getSseInitPath(name);
      req.headers = {
        ...ctx.req.headers,
        ...extra?.requestInfo?.headers,
        accept: 'application/json, text/event-stream',
        'content-type': 'application/json',
      };
      const newCtx = self.app.createContext(req, res) as unknown as Context;
      await ctx.app.ctxStorage.run(newCtx, async () => {
        await mw(newCtx, async () => {
          if (EggMcpRouter.hooks.length > 0) {
            for (const hook of EggMcpRouter.hooks) {
              await hook.preHandle?.(newCtx);
            }
          }
          messageFunc!(message, extra);
          if (isJSONRPCRequest(args[0])) {
            const map = self.sseTransportsRequestMap.get(transport as any)!;
            const wait = new Promise<null>((resolve, reject) => {
              if (extra && 'id' in extra) {
                map[extra.id as string] = { resolve, reject };
              }
            });
            await wait;
          }
        });
      });
    };
  }

  mcpServerRegister(name?: string): void {
    const routerFunc = this.router.post;
    const self = this;

    const mw = self.composeGlobalMiddleware(() => (self.app.middleware as any).teggCtxLifecycleMiddleware());
    const messageHander = async (ctx: Context) => {
      const sessionId = ctx.query.sessionId as string;

      if (self.transports[sessionId]) {
        if (EggMcpRouter.hooks.length > 0) {
          for (const hook of EggMcpRouter.hooks) {
            await hook.preHandleInitHandle?.(self.app.currentContext!);
          }
        }
        self.app.logger.info('message coming', sessionId);
        try {
          const ct = contentType.parse(ctx.req.headers['content-type'] ?? '');

          const rawBody = await getRawBody(ctx.req, {
            limit: '4mb',
            encoding: ct.parameters.charset ?? 'utf-8',
          });

          const body = JSON.parse(rawBody.toString());
          ctx.mcpArg = body;
          await self.transports[sessionId].handlePostMessage(ctx.req, ctx.res, body);
        } catch (error: any) {
          self.app.logger.error('Error handling MCP message', error);
          if (!ctx.res.headersSent) {
            ctx.status = 500;
            ctx.body = {
              jsonrpc: '2.0',
              error: {
                code: -32603,
                message: `Internal error: ${error.message}`,
              },
              id: null,
            };
          }
        }
        return;
      }
      if (EggMcpRouter.hooks.length > 0) {
        for (const hook of EggMcpRouter.hooks) {
          const checked = await hook.checkAndRunProxy?.(self.app.currentContext!, MCPProtocols.SSE, sessionId);
          if (checked) {
            return;
          }
        }
      }
    };
    Reflect.apply(routerFunc, this.router, [
      'chairMcpMessage',
      self.mcpConfig.getSseMessagePath(name),
      ...[mw],
      messageHander,
    ]);
  }

  getGlobalMiddleware(): void {
    // Build once. The named middleware factories come from `app.middlewares`,
    // which is only populated by `loadMiddleware`. Controller registration runs
    // during the tegg load-unit init (postCreate), before `loadMiddleware`, so
    // this is invoked lazily on the first request (see `composeGlobalMiddleware`)
    // instead of at registration time — otherwise registering a controller whose
    // `config.mcp.middleware` names a middleware throws `Middleware xxx not found`
    // at boot.
    if (this.globalMiddlewares) {
      return;
    }
    const middlewareNames = this.app.config.mcp.middleware || [];
    const middlewares: compose.Middleware<EggContext>[] = [];
    for (const name of middlewareNames) {
      const middlewareFactory = (this.app as unknown as any).middlewares[name];
      if (!middlewareFactory) {
        throw new TypeError(`Middleware ${name} not found`);
      }
      const options = (this.app.config as any)[name] || {};
      const mw = middlewareFactory(options, this.app);
      (mw as any)._name = name;
      middlewares.push(mw);
    }
    this.globalMiddlewares = compose(middlewares);
  }

  // Wrap a base middleware so that both the base middleware itself and the
  // configured global middlewares are resolved and composed on the first request
  // (when `app.middleware`/`app.middlewares` are ready), not at registration time.
  //
  // The base middleware factory must be passed as a thunk rather than an already
  // resolved middleware: `app.middleware.teggCtxLifecycleMiddleware` is loaded by
  // egg's `loadMiddleware`, which runs *after* controller registration (the tegg
  // load-unit init / postCreate). Calling it eagerly at registration time throws
  // `teggCtxLifecycleMiddleware is not a function`. Deferring the call to the
  // first request lets it bind once the middleware is loaded.
  composeGlobalMiddleware(mwFactory: () => compose.Middleware<EggContext>): compose.Middleware<EggContext> {
    const self = this;
    // Resolve + compose once on the first request, then reuse the composed chain
    // (globalMiddlewares is static after it is built) to avoid re-composing per
    // request.
    let resolved = false;
    let composed: compose.Middleware<EggContext>;
    return async (ctx, next) => {
      if (!resolved) {
        const mw = mwFactory();
        self.getGlobalMiddleware();
        composed = (
          self.globalMiddlewares ? compose([mw, self.globalMiddlewares]) : mw
        ) as compose.Middleware<EggContext>;
        resolved = true;
      }
      return composed(ctx as any, next);
    };
  }

  mcpServerPing(server: Server, sessionId: string, name?: string): void {
    const duration = this.mcpConfig.getPingElapsed(name);
    const interval = this.mcpConfig.getPingInterval(name);

    const startTime = Date.now();

    const timerId = setInterval(async () => {
      const elapsed = Date.now() - startTime;
      try {
        await server.ping();
      } catch (e) {
        this.app.logger.warn('mcp server ping failed: ', e);
      } finally {
        if (elapsed >= duration) {
          if (this.pingIntervals[sessionId]) {
            clearInterval(this.pingIntervals[sessionId]);
            delete this.pingIntervals[sessionId];
          }
        }
      }
    }, interval);

    this.pingIntervals[sessionId] = timerId;
  }
}
