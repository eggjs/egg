import { AbstractControllerAdvice } from '@eggjs/tegg';
import { ObjectInitType } from '@eggjs/tegg-types';
import { Advice } from '@eggjs/tegg/aop';
import type { ServiceWorkerFetchContext } from '@eggjs/tegg/standalone';

@Advice({ initType: ObjectInitType.SINGLETON })
export class FooControllerAdvice extends AbstractControllerAdvice<ServiceWorkerFetchContext> {
  async middleware(ctx: ServiceWorkerFetchContext, next: () => Promise<void>): Promise<void> {
    await next();
    ctx.body = { body: ctx.body };
  }
}
