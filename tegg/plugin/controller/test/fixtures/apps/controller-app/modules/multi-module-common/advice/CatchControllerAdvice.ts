import { AbstractControllerAdvice, type EggContext } from '@eggjs/tegg';
import { AccessLevel } from '@eggjs/tegg-types';
import { Advice } from '@eggjs/tegg/aop';

@Advice({ accessLevel: AccessLevel.PUBLIC })
export class CatchControllerAdvice extends AbstractControllerAdvice<EggContext> {
  async middleware(ctx: EggContext, next: () => Promise<void>): Promise<void> {
    try {
      await next();
    } catch (error) {
      ctx.body = { message: (error as Error).message };
    }
  }
}
