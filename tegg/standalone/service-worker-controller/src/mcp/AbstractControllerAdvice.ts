import type { AdviceContext, IAdvice } from '@eggjs/tegg-types';

import type { ServiceWorkerFetchContext } from '../http/ServiceWorkerFetchContext.ts';

/**
 * Base class for MCP controller AOP middlewares under the service worker
 * runtime: `@Middleware(SomeAdvice)` classes extending this run as koa-style
 * middlewares around the MCP transport handler.
 */
export abstract class AbstractControllerAdvice implements IAdvice {
  // Default no-op around to satisfy IAdvice structural type check
  async around(_ctx: AdviceContext, next: () => Promise<any>): Promise<any> {
    return next();
  }

  abstract middleware(ctx: ServiceWorkerFetchContext, next: () => Promise<void>): Promise<void>;
}
