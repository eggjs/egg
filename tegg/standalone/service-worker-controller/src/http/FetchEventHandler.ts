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
    // Finalize routes after all application load units have been created.
    this.httpRegisterProvider.doRegister(this.rootProtoManager);
    this.mcpRegisterProvider.doRegister();
    this.#routes = this.fetchRouter.middleware() as unknown as RouterMiddleware;
  }

  async handleEvent(event: FetchEvent): Promise<Response> {
    const ctx = this.fetchContextFactory?.create({ event }) ?? new ServiceWorkerFetchContext({ event });
    try {
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
      // Keep internal details out of the default response.
      console.error('[service-worker] handle fetch event failed:', e);
      return ResponseUtils.createErrorResponse(500, 'INTERNAL_SERVER_ERROR', 'Internal Server Error');
    }
  }

  /** Merge context headers without mutating an immutable Response. */
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
      // Preserve Set-Cookie as separate header values.
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

  /** Keep the request context alive until a streaming response completes. */
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
          /* stream consumption has ended */
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
