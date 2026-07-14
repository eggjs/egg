import { AbstractControllerAdvice, type ServiceWorkerFetchContext } from '@eggjs/service-worker-controller';
import { ObjectInitType } from '@eggjs/tegg-types';
import { Advice } from '@eggjs/tegg/aop';

@Advice({ initType: ObjectInitType.SINGLETON })
export class ErrorControllerAdvice extends AbstractControllerAdvice {
  async middleware(ctx: ServiceWorkerFetchContext, next: () => Promise<void>): Promise<void> {
    try {
      await next();
    } catch (e) {
      ctx.body = { message: (e as Error).message };
    }
  }
}
