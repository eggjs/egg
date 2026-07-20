import type { AdviceContext, IAdvice } from '@eggjs/tegg-types';

import type { ServiceWorkerFetchContext } from '../http/ServiceWorkerFetchContext.ts';

/** Base class for Koa-style MCP controller advice. */
export abstract class AbstractControllerAdvice implements IAdvice {
  // Required by the IAdvice contract; MCP uses middleware().
  async around(_ctx: AdviceContext, next: () => Promise<any>): Promise<any> {
    return next();
  }

  abstract middleware(ctx: ServiceWorkerFetchContext, next: () => Promise<void>): Promise<void>;
}
