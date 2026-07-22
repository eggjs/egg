import { AccessLevel } from '@eggjs/tegg-types';
import { Advice, type AdviceContext, type IAdvice } from '@eggjs/tegg/aop';

@Advice({ accessLevel: AccessLevel.PUBLIC })
export class ResultPointcutAdvice implements IAdvice {
  async around(_ctx: AdviceContext, next: () => Promise<any>): Promise<unknown> {
    return { ...(await next()), pointcut: true };
  }
}
