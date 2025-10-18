import { ContextProto } from '@eggjs/core-decorator';
import { Advice, Pointcut } from '@eggjs/aop-decorator';
import type { AdviceContext, IAdvice } from '@eggjs/tegg-types';

@Advice()
class PointcutAdvice implements IAdvice<Hello> {
  async beforeCall(ctx: AdviceContext<Hello>): Promise<void> {
    console.info(ctx);
  }
}

@ContextProto()
export class Hello {
  id = 233;

  @Pointcut(PointcutAdvice)
  async hello(name: string) {
    return `hello ${name}`;
  }
}
