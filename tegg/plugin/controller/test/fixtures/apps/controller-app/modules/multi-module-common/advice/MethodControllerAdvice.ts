import { AbstractControllerAdvice, type EggContext } from '@eggjs/tegg';
import { AccessLevel, type AdviceContext } from '@eggjs/tegg-types';
import { Advice } from '@eggjs/tegg/aop';

@Advice({ accessLevel: AccessLevel.PUBLIC })
export class MethodControllerAdvice extends AbstractControllerAdvice<EggContext> {
  async middleware(ctx: EggContext, next: () => Promise<void>, adviceContext: AdviceContext): Promise<void> {
    await next();
    ctx.body = {
      method: ctx.body,
      adviceContext: {
        controller: adviceContext.that.constructor.name,
        method: String(adviceContext.method),
        args: adviceContext.args.length,
      },
    };
  }
}
