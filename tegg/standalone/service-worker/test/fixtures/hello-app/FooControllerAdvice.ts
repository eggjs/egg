import { AbstractControllerAdvice, type ServiceWorkerFetchContext } from '@eggjs/service-worker-controller';
import { ObjectInitType } from '@eggjs/tegg-types';
import { Advice } from '@eggjs/tegg/aop';

@Advice({ initType: ObjectInitType.SINGLETON })
export class FooControllerAdvice extends AbstractControllerAdvice {
  async middleware(ctx: ServiceWorkerFetchContext, next: () => Promise<void>): Promise<void> {
    await next();
    ctx.body = { body: ctx.body };
  }
}
