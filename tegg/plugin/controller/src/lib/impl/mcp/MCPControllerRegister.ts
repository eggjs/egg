import assert from 'node:assert';
import http, { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';

import type { EggPrototype } from '@eggjs/metadata';
import { CONTROLLER_META_DATA, ControllerType, MCPProtocols } from '@eggjs/tegg';
import type {
  ControllerMetadata,
  MCPControllerMeta,
  MCPPromptMeta,
  MCPToolMeta,
  EggContext,
  EggObjectName,
  MCPResourceMeta,
} from '@eggjs/tegg';
import { EggContainerFactory } from '@eggjs/tegg-runtime';
import type { EggObject } from '@eggjs/tegg-runtime';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest, isJSONRPCRequest } from '@modelcontextprotocol/sdk/types.js';
import type { JSONRPCMessage, MessageExtraInfo } from '@modelcontextprotocol/sdk/types.js';
// @ts-expect-error await-event is not typed
import awaitEvent from 'await-event';
// @ts-expect-error content-type is not typed
import contentType from 'content-type';
import type { Application, Context, Router } from 'egg';
import compose from 'koa-compose';
import getRawBody from 'raw-body';

import type { ControllerRegister } from '../../ControllerRegister.ts';
import { MCPConfig } from './MCPConfig.ts';
import { MCPServerHelper } from './MCPServerHelper.ts';

export interface MCPControllerHook {
  // SSE
  preSSEInitHandle?: (ctx: Context, transport: SSEServerTransport, register: MCPControllerRegister) => Promise<void>;
  preHandleInitHandle?: (ctx: Context) => Promise<void>;

  // STREAM
  preHandle?: (ctx: Context) => Promise<void>;
  onStreamSessionInitialized?: (
    ctx: Context,
    transport: StreamableHTTPServerTransport,
    server: McpServer,
    register: MCPControllerRegister,
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

interface ServerRegisterRecord<T> {
  getOrCreateEggObject: (proto: EggPrototype, name?: EggObjectName) => Promise<EggObject>;
  proto: EggPrototype;
  meta: T;
}

class InnerSSEServerTransport extends SSEServerTransport {
  async send(message: JSONRPCMessage): Promise<void> {
    let err: null | Error = null;
    try {
      await super.send(message);
    } catch (e) {
      err = e as Error;
    } finally {
      const map = MCPControllerRegister.instance?.sseTransportsRequestMap.get(this);
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

export class MCPControllerRegister implements ControllerRegister {
  static instance?: MCPControllerRegister;
  readonly app: Application;
  readonly eggContainerFactory: typeof EggContainerFactory;
  private readonly router: Router;
  private controllerProtos: EggPrototype[] = [];
  private registeredControllerProtos: EggPrototype[] = [];
  transports: Record<string, InnerSSEServerTransport> = {};
  sseConnections: Map<string, { res: ServerResponse; intervalId: NodeJS.Timeout }> = new Map();
  mcpServerHelperMap: Record<string, () => MCPServerHelper> = {};
  mcpServerMap: Record<string, McpServer> = {};
  private controllerMeta: MCPControllerMeta;
  mcpConfig: MCPConfig;
  streamTransports: Record<string, StreamableHTTPServerTransport> = {};
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

  static hooks: MCPControllerHook[] = [];
  globalMiddlewares: compose.ComposedMiddleware<EggContext>;

  registerMap: Record<
    string,
    {
      tools: ServerRegisterRecord<MCPToolMeta>[];
      prompts: ServerRegisterRecord<MCPPromptMeta>[];
      resources: ServerRegisterRecord<MCPResourceMeta>[];
    }
  > = {};

  pingIntervals: Record<string, NodeJS.Timeout> = {};

  static create(proto: EggPrototype, controllerMeta: ControllerMetadata, app: Application): MCPControllerRegister {
    assert(controllerMeta.type === ControllerType.MCP, 'controller meta type is not MCP');
    if (!MCPControllerRegister.instance) {
      MCPControllerRegister.instance = new MCPControllerRegister(proto, controllerMeta as MCPControllerMeta, app);
    }
    MCPControllerRegister.instance.controllerProtos.push(proto);
    return MCPControllerRegister.instance;
  }

  constructor(_proto: EggPrototype, controllerMeta: MCPControllerMeta, app: Application) {
    this.app = app;
    this.eggContainerFactory = app.eggContainerFactory;
    this.router = app.router;

    this.controllerMeta = controllerMeta;

    this.mcpConfig = new MCPConfig(app.config.mcp);
  }

  static addHook(hook: MCPControllerHook): void {
    MCPControllerRegister.hooks.push(hook);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static async connectStatelessStreamTransport(_name?: string): Promise<void> {
    // No-op: MCP SDK >= 1.26 requires stateless transports to be single-use,
    // so transports are now created per-request in the route handler.
  }

  static clean(): void {
    if (this.instance) {
      this.instance.controllerProtos = [];
    }
    this.instance = undefined;
  }

  mcpStatelessStreamServerInit(name?: string): void {
    const postRouterFunc = this.router.post;
    const self = this;
    let mw = (self.app.middleware as any).teggCtxLifecycleMiddleware();
    if (self.globalMiddlewares) {
      mw = compose([mw, self.globalMiddlewares]);
    }
    const initHandler = async (ctx: Context) => {
      // Create fresh transport and server per request
      // MCP SDK >= 1.26 requires stateless transports to be single-use
      const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      const mcpServerHelper = self.mcpServerHelperMap[name ?? 'default']();
      const registerEntry = self.registerMap[name ?? 'default'];
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
      await mcpServerHelper.server.connect(transport);
      const onmessage = transport.onmessage;
      transport.onmessage = async (message: JSONRPCMessage, extra?: MessageExtraInfo) => {
        if (self.app.currentContext) {
          self.app.currentContext.mcpArg = message;
        }
        onmessage && (await onmessage(message, extra));
      };
      if (MCPControllerRegister.hooks.length > 0) {
        for (const hook of MCPControllerRegister.hooks) {
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
    let mw = (self.app.middleware as any).teggCtxLifecycleMiddleware();
    if (self.globalMiddlewares) {
      mw = compose([mw, self.globalMiddlewares]);
    }
    const initHandler = async (ctx: Context) => {
      ctx.respond = false;
      if (MCPControllerRegister.hooks.length > 0) {
        for (const hook of MCPControllerRegister.hooks) {
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
          for (const tool of self.registerMap[name ?? 'default'].tools) {
            await mcpServerHelper.mcpToolRegister(tool.getOrCreateEggObject, tool.proto, tool.meta);
          }
          for (const resource of self.registerMap[name ?? 'default'].resources) {
            await mcpServerHelper.mcpResourceRegister(resource.getOrCreateEggObject, resource.proto, resource.meta);
          }
          for (const prompt of self.registerMap[name ?? 'default'].prompts) {
            await mcpServerHelper.mcpPromptRegister(prompt.getOrCreateEggObject, prompt.proto, prompt.meta);
          }
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => this.mcpConfig.getSessionIdGenerator(name)(ctx),
            eventStore,
            onsessioninitialized: async (sessionId) => {
              if (MCPControllerRegister.hooks.length > 0) {
                for (const hook of MCPControllerRegister.hooks) {
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
          if (MCPControllerRegister.hooks.length > 0) {
            for (const hook of MCPControllerRegister.hooks) {
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
        if (MCPControllerRegister.hooks.length > 0) {
          for (const hook of MCPControllerRegister.hooks) {
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
      const id = transport.sessionId;
      if (MCPControllerRegister.hooks.length > 0) {
        for (const hook of MCPControllerRegister.hooks) {
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
      for (const tool of self.registerMap[name ?? 'default'].tools) {
        mcpServerHelper.mcpToolRegister(tool.getOrCreateEggObject, tool.proto, tool.meta);
      }
      for (const resource of self.registerMap[name ?? 'default'].resources) {
        mcpServerHelper.mcpResourceRegister(resource.getOrCreateEggObject, resource.proto, resource.meta);
      }
      for (const prompt of self.registerMap[name ?? 'default'].prompts) {
        mcpServerHelper.mcpPromptRegister(prompt.getOrCreateEggObject, prompt.proto, prompt.meta);
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
    let mw = (this.app.middleware as any).teggCtxLifecycleMiddleware();
    if (self.globalMiddlewares) {
      mw = compose([mw, self.globalMiddlewares]);
    }
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
          if (MCPControllerRegister.hooks.length > 0) {
            for (const hook of MCPControllerRegister.hooks) {
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

    let mw = (self.app.middleware as any).teggCtxLifecycleMiddleware();
    if (self.globalMiddlewares) {
      mw = compose([mw, self.globalMiddlewares]);
    }
    const messageHander = async (ctx: Context) => {
      const sessionId = ctx.query.sessionId as string;

      if (self.transports[sessionId]) {
        if (MCPControllerRegister.hooks.length > 0) {
          for (const hook of MCPControllerRegister.hooks) {
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
      if (MCPControllerRegister.hooks.length > 0) {
        for (const hook of MCPControllerRegister.hooks) {
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

  async register(): Promise<void> {
    for (const proto of this.controllerProtos) {
      if (this.registeredControllerProtos.includes(proto)) {
        continue;
      }
      const metadata = proto.getMetaData(CONTROLLER_META_DATA) as MCPControllerMeta;
      if (!this.mcpServerHelperMap[metadata.name ?? 'default']) {
        this.getGlobalMiddleware();
        this.mcpServerHelperMap[metadata.name ?? 'default'] = () => {
          return new MCPServerHelper({
            name: this.controllerMeta.name ?? `chair-mcp-${metadata.name ?? this.app.name}-server`,
            version: this.controllerMeta.version ?? '1.0.0',
            hooks: MCPControllerRegister.hooks,
          });
        };
        this.mcpStatelessStreamServerInit(metadata.name);
        this.mcpStreamServerInit(metadata.name);
        this.mcpServerInit(metadata.name);
        this.mcpServerRegister(metadata.name);
        if (metadata.name) {
          this.mcpConfig.setMultipleServerPath(this.app, metadata.name);
        }
      }
      for (const prompt of metadata.prompts) {
        if (!this.registerMap[metadata.name ?? 'default']) {
          this.registerMap[metadata.name ?? 'default'] = {
            prompts: [],
            resources: [],
            tools: [],
          };
        }
        this.registerMap[metadata.name ?? 'default'].prompts.push({
          getOrCreateEggObject: this.eggContainerFactory.getOrCreateEggObject.bind(this.eggContainerFactory),
          proto,
          meta: prompt,
        });
      }
      for (const resource of metadata.resources) {
        if (!this.registerMap[metadata.name ?? 'default']) {
          this.registerMap[metadata.name ?? 'default'] = {
            prompts: [],
            resources: [],
            tools: [],
          };
        }
        this.registerMap[metadata.name ?? 'default'].resources.push({
          getOrCreateEggObject: this.eggContainerFactory.getOrCreateEggObject.bind(this.eggContainerFactory),
          proto,
          meta: resource,
        });
      }
      for (const tool of metadata.tools) {
        if (!this.registerMap[metadata.name ?? 'default']) {
          this.registerMap[metadata.name ?? 'default'] = {
            prompts: [],
            resources: [],
            tools: [],
          };
        }
        this.registerMap[metadata.name ?? 'default'].tools.push({
          getOrCreateEggObject: this.eggContainerFactory.getOrCreateEggObject.bind(this.eggContainerFactory),
          proto,
          meta: tool,
        });
      }
      this.registeredControllerProtos.push(proto);
    }
  }
}
