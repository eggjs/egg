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
  get badGetter() {
    throw new Error('never access getter');
  }

  @Pointcut(PointcutAdviceBeforeCallExample)
  foo() {}
}

@ContextProto()
export class PointcutExample {
  @Pointcut(PointcutAdviceBeforeCallExample)
  @Pointcut(PointcutAdviceAfterReturnExample)
  hello() {
    console.log('hello');
  }
}
