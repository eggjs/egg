import { ObjectInitType } from '@eggjs/tegg';
import { Advice } from '@eggjs/tegg/aop';
import { AbstractControllerAdvice } from '../../../src/mcp/AbstractControllerAdvice.ts';
import type { ServiceWorkerFetchContext } from '../../../src/http/ServiceWorkerFetchContext.ts';

// Track middleware execution for testing
export const httpAdviceExecutionLog: string[] = [];

@Advice({ initType: ObjectInitType.SINGLETON })
export class HttpTestAdvice extends AbstractControllerAdvice {
  async middleware(_ctx: ServiceWorkerFetchContext, next: () => Promise<void>): Promise<void> {
    httpAdviceExecutionLog.push('before');
    await next();
    httpAdviceExecutionLog.push('after');
  }
}
