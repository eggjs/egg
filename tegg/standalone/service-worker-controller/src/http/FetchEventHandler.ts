import type { RootProtoManager } from '@eggjs/controller-runtime';
import { AccessLevel, Inject, InjectOptional } from '@eggjs/tegg';
import { ContextHandler, EggContextLifecycleUtil } from '@eggjs/tegg-runtime';
import type { FetchEvent } from '@eggjs/tegg-types';
import { AbstractEventHandler, EventHandlerProto } from '@eggjs/tegg/standalone';

import { MCPRegisterProvider } from '../mcp/MCPRegisterProvider.ts';
import type { ErrorResponseMapper, FetchContextFactory } from '../types.ts';
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
    this.mcpRegisterProvider.doRegister();
    this.#routes = this.fetchRouter.middleware() as unknown as RouterMiddleware;
  }

  async handleEvent(event: FetchEvent): Promise<Response> {
    const ctx = this.fetchContextFactory?.create({ event }) ?? new ServiceWorkerFetchContext({ event });
    try {
      // Inside the try so a route-registration failure returns the unified 500
      // error shape instead of rejecting handleEvent's promise.
      await this.initRoutes();
      await this.#routes!(ctx, async () => {
        /* noop */
      });
      const response = ctx.response;
      if (!response) {
        return ResponseUtils.createErrorResponse(404, 'NOT_FOUND', `${ctx.method} ${ctx.path} not found`);
      }
      return await this.#guardResponseStream(this.#mergeResponseHeaders(response, ctx.responseHeaders));
    } catch (e) {
      const mapped = this.errorResponseMapper?.toResponse(e, ctx);
      if (mapped) {
        return mapped;
      }
      // Log the real error server-side; reply a generic message so internal error
      // details never reach the client (a host that wants to surface them provides
      // an `errorResponseMapper`, handled above).
      console.error('[service-worker] handle fetch event failed:', e);
      return ResponseUtils.createErrorResponse(500, 'INTERNAL_SERVER_ERROR', 'Internal Server Error');
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
      // `entries()` folds multiple Set-Cookie into one comma-joined value, which
      // corrupts cookies; carry them over individually via getSetCookie().
      if (key === 'set-cookie') {
        continue;
      }
      headers.set(key, value);
    }
    for (const cookie of extra.getSetCookie()) {
      headers.append('set-cookie', cookie);
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  /**
   * The tegg context is destroyed as soon as the runner returns, but a
   * streaming body keeps pulling from the ContextProto objects afterwards. Tee
   * the body: the client consumes one branch, and the request context's
   * `preDestroy` awaits the other draining — so the ContextProto objects the
   * stream pulls from stay alive until the source is fully produced, then the
   * context tears down. Client aborts end the drain normally, not as an error.
   */
  async #guardResponseStream(response: Response): Promise<Response> {
    if (!response.body) {
      return response;
    }
    const ctx = ContextHandler.getContext();
    if (!ctx) {
      return response;
    }
    const [clientStream, monitorStream] = response.body.tee();
    EggContextLifecycleUtil.registerObjectLifecycle(ctx, {
      preDestroy: async () => {
        await monitorStream.pipeTo(new WritableStream()).catch(() => {
          /* client abort / stream error: consumption is over either way */
        });
      },
    });
    return new Response(clientStream, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }
}
