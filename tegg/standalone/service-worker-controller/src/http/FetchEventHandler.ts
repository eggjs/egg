import type { RootProtoManager } from '@eggjs/controller-runtime';
import { BackgroundTaskHelper } from '@eggjs/service-worker-runtime';
import { AccessLevel, Inject, InjectOptional } from '@eggjs/tegg';
import { EggContainerFactory } from '@eggjs/tegg-runtime';
import type { EggProtoImplClass } from '@eggjs/tegg-types';
import { AbstractEventHandler, EventHandlerProto } from '@eggjs/tegg/standalone';

import { MCPRegisterProvider } from '../mcp/MCPRegisterProvider.ts';
import type { ErrorResponseMapper, FetchContextFactory, FetchEvent } from '../types.ts';
import { ResponseUtils } from '../utils/ResponseUtils.ts';
import { FetchRouter } from './FetchRouter.ts';
import { HTTPRegisterProvider } from './HTTPRegisterProvider.ts';
import { ServiceWorkerFetchContext } from './ServiceWorkerFetchContext.ts';

type RouterMiddleware = (ctx: ServiceWorkerFetchContext, next: () => Promise<void>) => Promise<void>;

@EventHandlerProto('fetch', { accessLevel: AccessLevel.PUBLIC })
export class FetchEventHandler extends AbstractEventHandler<FetchEvent, Response> {
  @Inject()
  private readonly fetchRouter: FetchRouter;

  @Inject()
  private readonly rootProtoManager: RootProtoManager;

  @Inject()
  private readonly httpRegisterProvider: HTTPRegisterProvider;

  @Inject()
  private readonly mcpRegisterProvider: MCPRegisterProvider;

  @InjectOptional()
  private readonly fetchContextFactory?: FetchContextFactory;

  @InjectOptional()
  private readonly errorResponseMapper?: ErrorResponseMapper;

  #routes?: RouterMiddleware;
  #initPromise?: Promise<void>;

  private async initRoutes(): Promise<void> {
    if (this.#routes) {
      return;
    }
    this.#initPromise ??= this.doInitRoutes().catch((err) => {
      this.#initPromise = undefined;
      throw err;
    });
    await this.#initPromise;
  }

  private async doInitRoutes(): Promise<void> {
    // Routes land on the router lazily at the first event: every load unit has
    // been created by now, so all controller protos are collected.
    this.httpRegisterProvider.doRegister(this.rootProtoManager);
    await this.mcpRegisterProvider.doRegister();
    this.#routes = this.fetchRouter.middleware() as unknown as RouterMiddleware;
  }

  async handleEvent(event: FetchEvent): Promise<Response> {
    await this.initRoutes();
    const ctx = this.fetchContextFactory?.create({ event }) ?? new ServiceWorkerFetchContext({ event });
    try {
      await this.#routes!(ctx, async () => {
        /* noop */
      });
      const response = ctx.response;
      if (!response) {
        return ResponseUtils.createErrorResponse(404, 'NOT_FOUND', `${ctx.method} ${ctx.path} not found`);
      }
      return await this.#guardResponseStream(this.#mergeResponseHeaders(response, ctx.responseHeaders));
    } catch (e: any) {
      const mapped = this.errorResponseMapper?.toResponse(e, ctx);
      if (mapped) {
        return mapped;
      }
      console.error('[service-worker] handle fetch event failed:', e);
      return ResponseUtils.createErrorResponse(500, 'INTERNAL_SERVER_ERROR', e?.message ?? 'internal error');
    }
  }

  /**
   * Merge headers set by middlewares/controllers onto the response. A native /
   * redirect / error Response has immutable headers, so mutating in place would
   * throw; rebuild through a fresh Headers copy only when there is something to
   * merge.
   */
  #mergeResponseHeaders(response: Response, extra: Headers): Response {
    let hasExtra = false;
    for (const _ of extra.keys()) {
      hasExtra = true;
      break;
    }
    if (!hasExtra) {
      return response;
    }
    const headers = new Headers(response.headers);
    for (const [key, value] of extra.entries()) {
      headers.set(key, value);
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  /**
   * The tegg context is destroyed as soon as the runner returns, but a
   * streaming body keeps pulling from ContextProto objects afterwards. Route
   * the body through a passthrough and register the drain as a background
   * task: ctx destroy then waits (bounded by `config.backgroundTask.timeout`)
   * until the client has fully consumed the stream. Client aborts are a
   * normal way for the drain to end, not an error.
   */
  async #guardResponseStream(response: Response): Promise<Response> {
    if (!response.body) {
      return response;
    }
    const { readable, writable } = new TransformStream();
    const drained = response.body.pipeTo(writable).catch(() => {
      /* client abort / stream error: consumption is over either way */
    });
    const eggObject = await EggContainerFactory.getOrCreateEggObjectFromClazz(
      BackgroundTaskHelper as unknown as EggProtoImplClass,
    );
    (eggObject.obj as BackgroundTaskHelper).run(() => drained);
    return new Response(readable, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }
}
