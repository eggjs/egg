import assert from 'node:assert';
import { IncomingMessage, OutgoingHttpHeader, OutgoingHttpHeaders, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import { Readable, PassThrough } from 'node:stream';
import { Router as KoaRouter } from '@eggjs/router';
import {
  CONTROLLER_META_DATA,
  ControllerMetadata,
  ControllerType,
  MCPControllerMeta,
  MCPPromptMeta,
  MCPResourceMeta,
  MCPToolMeta,
} from '@eggjs/tegg';
import type { EggObject, EggObjectName, EggProtoImplClass, EggPrototype } from '@eggjs/tegg-types';
import { CONTROLLER_AOP_MIDDLEWARES } from '@eggjs/tegg-types/controller-decorator';
import { EggContainerFactory } from '@eggjs/tegg/helper';
import type { AbstractControllerAdvice } from './AbstractControllerAdvice.ts';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { ControllerRegister } from '../controller/ControllerRegister.ts';
import { ServiceWorkerFetchContext } from '../http/ServiceWorkerFetchContext.ts';
import { MCPServerHelper } from './MCPServerHelper.ts';

interface ServerRegisterRecord<T> {
  getOrCreateEggObject: (proto: EggPrototype, name?: EggObjectName) => Promise<EggObject>;
  proto: EggPrototype;
  meta: T;
}

// Bridge ServerResponse to a PassThrough stream for Fetch API Response construction
class ServiceWorkerMCPServerResponse extends ServerResponse {
  callback: (value: object) => void;
  #stream: PassThrough;

  constructor(req: IncomingMessage, callback: (value: object) => void) {
    super(req);
    this.callback = callback;
    this.#stream = new PassThrough();
  }

  write(chunk: any, callback?: (error: Error | null | undefined) => void): boolean;
  write(chunk: any, encoding: BufferEncoding, callback?: (error: Error | null | undefined) => void): boolean;
  write(
    chunk: any,
    encoding?: BufferEncoding | ((error: Error | null | undefined) => void),
    callback?: (error: Error | null | undefined) => void,
  ): boolean {
    super.write(chunk, encoding as any, callback);
    return this.#stream.write(chunk, encoding as any, callback);
  }

  get stream() {
    return this.#stream;
  }

  writeHead(
    statusCode: number,
    headers?: OutgoingHttpHeaders | OutgoingHttpHeader[]
  ): this;
  writeHead(
    statusCode: number,
    statusMessage?: string,
    headers?: OutgoingHttpHeaders | OutgoingHttpHeader[],
  ): this;
  writeHead(
    statusCode: number,
    reason?: string | (OutgoingHttpHeaders | OutgoingHttpHeader[]),
    obj?: OutgoingHttpHeaders | OutgoingHttpHeader[],
  ): this {
    if (typeof reason === 'string') {
      super.writeHead(statusCode, reason, obj);
      this.callback({
        status: statusCode,
        headers: {
          ...(obj ? obj : {}),
          'X-Accel-Buffering': 'no',
        },
      });
    } else {
      super.writeHead(statusCode, reason);
      this.callback({
        status: statusCode,
        headers: {
          ...(reason ? {
            ...reason,
            ...(reason['content-length'] ? {} : { 'transfer-encoding': 'chunked' }),
          } : {}),
          'X-Accel-Buffering': 'no',
        },
      });
    }
    return this;
  }

  end(cb?: () => void): this;
  end(chunk: any, cb?: () => void): this;
  end(chunk: any, encoding: BufferEncoding, cb?: () => void): this;
  end(...args: any[]): this {
    this.#stream.end(...args);
    super.end(...args);
    return this;
  }
}

export class MCPControllerRegister implements ControllerRegister {
  static instance?: MCPControllerRegister;

  private readonly router: KoaRouter;
  private controllerProtos: EggPrototype[] = [];
  private registeredControllerProtos: EggPrototype[] = [];
  private controllerMeta: MCPControllerMeta;
  mcpServerHelperMap: Record<string, () => MCPServerHelper> = {};
  streamTransports: Record<string, StreamableHTTPServerTransport> = {};
  middlewaresMap: Record<string, Array<(ctx: ServiceWorkerFetchContext, next: () => Promise<void>) => Promise<void>>> = {};
  registerMap: Record<string, {
    tools: ServerRegisterRecord<MCPToolMeta>[];
    prompts: ServerRegisterRecord<MCPPromptMeta>[];
    resources: ServerRegisterRecord<MCPResourceMeta>[];
  }> = {};

  static create(proto: EggPrototype, controllerMeta: ControllerMetadata, router: KoaRouter) {
    assert(controllerMeta.type === ControllerType.MCP, 'controller meta type is not MCP');
    if (!MCPControllerRegister.instance) {
      MCPControllerRegister.instance = new MCPControllerRegister(controllerMeta as MCPControllerMeta, router);
    }
    MCPControllerRegister.instance.controllerProtos.push(proto);
    return MCPControllerRegister.instance;
  }

  constructor(controllerMeta: MCPControllerMeta, router: KoaRouter) {
    this.router = router;
    this.controllerMeta = controllerMeta;
  }

  static clean() {
    if (this.instance) {
      this.instance.controllerProtos = [];
      this.instance.registeredControllerProtos = [];
      this.instance.registerMap = {};
      this.instance.mcpServerHelperMap = {};
      this.instance.middlewaresMap = {};
    }
    this.instance = undefined;
  }

  /**
   * Connect the long-lived stateless stream transport and prime it with an
   * initialize call, matching the chair service-worker pattern. Must be
   * called after register() so all tools are already on the helper.
   */
  async connectStatelessStreamTransport(name?: string) {
    const inst = MCPControllerRegister.instance;
    if (!inst) return;
    const transport = inst.streamTransports[name ?? 'default'];
    const mcpServerHelper = this.mcpServerHelperMap[name ?? 'default']();
    const registerEntry = this.registerMap[name ?? 'default'];
    if (registerEntry) {
      for (const tool of registerEntry.tools) {
        await mcpServerHelper.mcpToolRegister(
          tool.getOrCreateEggObject,
          tool.proto,
          tool.meta,
        );
      }
      for (const resource of registerEntry.resources) {
        await mcpServerHelper.mcpResourceRegister(
          resource.getOrCreateEggObject,
          resource.proto,
          resource.meta,
        );
      }
      for (const prompt of registerEntry.prompts) {
        await mcpServerHelper.mcpPromptRegister(
          prompt.getOrCreateEggObject,
          prompt.proto,
          prompt.meta,
        );
      }
    }
    await mcpServerHelper.server.connect(transport);
    const socket = new Socket();
    const req = new IncomingMessage(socket);
    const res = new ServerResponse(req);
    req.method = 'POST';
    req.url = '/mcp/stream';
    req.headers = {
      accept: 'application/json, text/event-stream',
      'content-type': 'application/json',
    };
    const initBody = {
      jsonrpc: '2.0', id: 0, method: 'initialize',
      params: {
        protocolVersion: '2024-11-05', capabilities: {},
        clientInfo: { name: 'init-client', version: '1.0.0' },
      },
    };
    await inst.streamTransports[name ?? 'default'].handleRequest(req, res, initBody);
  }

  private async mcpStatelessStreamServerInit(name?: string) {
    const postRouterFunc = this.router.post;
    // Create fresh transport and server per request (stateless mode)
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    MCPControllerRegister.instance!.streamTransports[name ?? 'default'] = transport;
    const initHandler = async (ctx: ServiceWorkerFetchContext) => {
      const transport = MCPControllerRegister.instance!.streamTransports[name ?? 'default'];

      // Bridge Fetch Request → Node.js IncomingMessage
      const socket = new Socket();
      const req = new IncomingMessage(socket);
      req.url = ctx.url.pathname + ctx.url.search;
      const headers: Record<string, string> = {};
      for (const [ key, value ] of ctx.event.request.headers.entries()) {
        headers[key] = value;
        req.rawHeaders.push(key);
        req.rawHeaders.push(value);
      }
      req.headers = headers;
      req.method = ctx.event.request.method;

      // Create bridge ServerResponse → PassThrough → Fetch Response
      let callback: (value: object) => void;
      const resPromise = new Promise<object>(resolve => {
        callback = resolve;
      });
      const response = new ServiceWorkerMCPServerResponse(req, callback!);

      // Parse body from Fetch Request
      const body = await ctx.event.request.json();

      // Handle the request (don't await - handleRequest writes to response stream)
      transport.handleRequest(req, response, body);

      const init = await resPromise;

      ctx.response = new Response(Readable.toWeb(response.stream) as any, init) as any;
    };

    const streamPath = `/mcp${name ? `/${name}` : ''}/stream`;
    const middlewares = this.middlewaresMap[name ?? 'default'] ?? [];
    Reflect.apply(postRouterFunc, this.router, [
      'mcpStatelessStreamInit',
      streamPath,
      ...middlewares,
      initHandler,
    ]);

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
    Reflect.apply(getRouterFunc, this.router, [
      'mcpStatelessStreamNotAllowed',
      streamPath,
      notAllowedHandler,
    ]);
    Reflect.apply(delRouterFunc, this.router, [
      'mcpStatelessStreamNotAllowed',
      streamPath,
      notAllowedHandler,
    ]);
  }

  async register() {
    for (const proto of this.controllerProtos) {
      if (this.registeredControllerProtos.includes(proto)) {
        continue;
      }
      const metadata = proto.getMetaData(CONTROLLER_META_DATA) as MCPControllerMeta;
      if (!this.mcpServerHelperMap[metadata.name ?? 'default']) {
        this.mcpServerHelperMap[metadata.name ?? 'default'] = () => {
          return new MCPServerHelper({
            name: this.controllerMeta.name ?? `mcp-${metadata.name ?? 'default'}-server`,
            version: this.controllerMeta.version ?? '1.0.0',
          });
        };
      }
      if (!this.registerMap[metadata.name ?? 'default']) {
        this.registerMap[metadata.name ?? 'default'] = {
          prompts: [],
          resources: [],
          tools: [],
        };
      }
      for (const tool of metadata.tools) {
        this.registerMap[metadata.name ?? 'default'].tools.push({
          getOrCreateEggObject: EggContainerFactory.getOrCreateEggObject.bind(
            EggContainerFactory,
          ),
          proto,
          meta: tool,
        });
      }
      for (const resource of metadata.resources) {
        this.registerMap[metadata.name ?? 'default'].resources.push({
          getOrCreateEggObject: EggContainerFactory.getOrCreateEggObject.bind(
            EggContainerFactory,
          ),
          proto,
          meta: resource,
        });
      }
      for (const prompt of metadata.prompts) {
        this.registerMap[metadata.name ?? 'default'].prompts.push({
          getOrCreateEggObject: EggContainerFactory.getOrCreateEggObject.bind(
            EggContainerFactory,
          ),
          proto,
          meta: prompt,
        });
      }

      // Collect middlewares for this server name
      const serverName = metadata.name ?? 'default';
      if (!this.middlewaresMap[serverName]) {
        this.middlewaresMap[serverName] = [];
      }

      // Function-type middlewares from MCPControllerMeta
      const classMiddlewares = metadata.middlewares ?? [];
      for (const mw of classMiddlewares) {
        this.middlewaresMap[serverName].push(mw as unknown as (ctx: ServiceWorkerFetchContext, next: () => Promise<void>) => Promise<void>);
      }

      // AOP-type middlewares from class metadata
      const aopMiddlewareClasses = (proto.getMetaData(CONTROLLER_AOP_MIDDLEWARES) ?? []) as EggProtoImplClass<AbstractControllerAdvice>[];
      for (const clazz of aopMiddlewareClasses) {
        this.middlewaresMap[serverName].push(async (ctx: ServiceWorkerFetchContext, next: () => Promise<void>) => {
          const eggObj = await EggContainerFactory.getOrCreateEggObjectFromClazz(clazz);
          await (eggObj.obj as AbstractControllerAdvice).middleware(ctx, next);
        });
      }

      this.registeredControllerProtos.push(proto);
    }
  }

  async doRegister() {
    // Initialize MCP routes for each server name
    const names = Object.keys(this.registerMap);
    for (const name of names) {
      await this.mcpStatelessStreamServerInit(name === 'default' ? undefined : name);
      await this.connectStatelessStreamTransport(name);
    }
  }
}
