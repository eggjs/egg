import { ObjectInitType } from '@eggjs/tegg';
import { Advice } from '@eggjs/tegg/aop';
import { AbstractControllerAdvice } from '../../../src/mcp/AbstractControllerAdvice.ts';
import type { ServiceWorkerFetchContext } from '../../../src/http/ServiceWorkerFetchContext.ts';

// Track middleware execution for testing
export const adviceExecutionLog: string[] = [];

@Advice({ initType: ObjectInitType.SINGLETON })
export class McpTestAdvice extends AbstractControllerAdvice {
  async middleware(_ctx: ServiceWorkerFetchContext, next: () => Promise<void>): Promise<void> {
    adviceExecutionLog.push('before');
    await next();
    adviceExecutionLog.push('after');
  }
}
