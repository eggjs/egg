import { ContextProto } from '@eggjs/core-decorator';
import { Pointcut } from '@eggjs/aop-decorator';
import { PointcutAdvice, pointcutAdviceParams } from '../hello_point_cut/HelloPointCut.js';
import { StatePointcutAdvice } from '../state_point_cut/StatePointCut.js';

@ContextProto()
export class Hello {
  id = 233;

  @Pointcut(PointcutAdvice, { adviceParams: pointcutAdviceParams })
  async hello(name: string): Promise<string> {
    return `hello ${name}`;
  }

  @Pointcut(PointcutAdvice, { adviceParams: pointcutAdviceParams })
  async helloWithException(name: string): Promise<never> {
    throw new Error(`ops, exception for ${name}`);
  }

  @Pointcut(StatePointcutAdvice)
  async helloState(name: string): Promise<string> {
    return `hello ${name}`;
  }
}
