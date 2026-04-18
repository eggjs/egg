import type { Next } from '@eggjs/tegg-types/controller-decorator';
import type { IAdvice, AdviceContext } from '@eggjs/tegg-types/aop';
import type { ServiceWorkerFetchContext } from '../http/ServiceWorkerFetchContext.ts';

export abstract class AbstractControllerAdvice implements IAdvice {
  // Default no-op around to satisfy IAdvice structural type check
  async around(_ctx: AdviceContext, next: () => Promise<any>): Promise<any> {
    return next();
  }

  abstract middleware(ctx: ServiceWorkerFetchContext, next: Next): Promise<void>;
}
