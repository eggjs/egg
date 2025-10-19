import { ContextProto, Inject, SingletonProto } from '@eggjs/core-decorator';
import { Pointcut } from '@eggjs/aop-decorator';
import { PointcutAdvice, pointcutAdviceParams } from '../hello_point_cut/HelloPointCut.js';

@SingletonProto()
export class Foo {}

@ContextProto()
export class HelloConstructorInject {
  id = 233;

  // @ts-expect-error: readonly property in constructor
  constructor(@Inject() readonly foo: Foo) {}

  @Pointcut(PointcutAdvice, { adviceParams: pointcutAdviceParams })
  async hello(name: string): Promise<string> {
    return `hello ${name}`;
  }

  @Pointcut(PointcutAdvice, { adviceParams: pointcutAdviceParams })
  async helloWithException(name: string): Promise<never> {
    throw new Error(`ops, exception for ${name}`);
  }
}
