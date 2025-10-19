import { ContextProto } from '@eggjs/core-decorator';
import type { AdviceContext, IAdvice } from '@eggjs/tegg-types';

import { Advice, Pointcut } from '../../src/index.ts';

@Advice()
export class PointcutAdviceBeforeCallExample implements IAdvice {
  async beforeCall(ctx: AdviceContext): Promise<void> {
    console.log('ctx: ', ctx);
  }
}

@Advice()
export class PointcutAdviceAfterReturnExample implements IAdvice {
  async afterReturn(ctx: AdviceContext): Promise<void> {
    console.log('ctx: ', ctx);
  }
}

@ContextProto()
export class GetterExample {
  get badGetter(): never {
    throw new Error('never access getter');
  }

  @Pointcut(PointcutAdviceBeforeCallExample)
  foo(): void {}
}

@ContextProto()
export class PointcutExample {
  @Pointcut(PointcutAdviceBeforeCallExample)
  @Pointcut(PointcutAdviceAfterReturnExample)
  hello(): void {
    console.log('hello');
  }
}
