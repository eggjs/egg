import { AccessLevel, ContextProto, Inject, ObjectInitType, SingletonProto } from '@eggjs/tegg';
import { Advice, type AdviceContext, Crosscut, type IAdvice, Pointcut, PointcutType } from '@eggjs/tegg/aop';
import type { EggLogger } from 'egg';

@Advice()
export class PointcutAdvice implements IAdvice<Hello> {
  async around(ctx: AdviceContext<Hello>, next: () => Promise<any>): Promise<any> {
    ctx.args[0] = `withPointAroundParam(${ctx.args[0]})`;
    const result = await next();
    return `withPointAroundResult(${result})`;
  }
}

@ContextProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class Hello {
  id = 233;

  @Inject()
  logger: EggLogger;

  @Pointcut(PointcutAdvice)
  async hello(name: string): Promise<string> {
    return `hello ${name}`;
  }

  async helloEggObjectAop(): Promise<void> {
    this.logger.info('foo');
  }

  // Crosscut from another module (aop-cross-module) to exercise cross-loadUnit weaving.
  async helloCross(name: string): Promise<string> {
    return `helloCross ${name}`;
  }
}

@Crosscut({
  type: PointcutType.CLASS,
  clazz: Hello,
  methodName: 'hello',
})
@Advice()
export class CrosscutAdvice implements IAdvice<Hello> {
  async around(ctx: AdviceContext<Hello>, block: () => Promise<any>): Promise<any> {
    ctx.args[0] = `withCrosscutAroundParam(${ctx.args[0]})`;
    const result = await block();
    return `withCrossAroundResult(${result})`;
  }
}

@Advice({ initType: ObjectInitType.CONTEXT })
export class ContextPointcutAdvice implements IAdvice<SingletonHello> {
  async around(ctx: AdviceContext<Hello>, next: () => Promise<any>): Promise<any> {
    ctx.args[0] = `withContextPointAroundParam(${ctx.args[0]})`;
    const result = await next();
    return `withContextPointAroundResult(${result})`;
  }
}

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class SingletonHello {
  id = 233;

  @Inject()
  logger: EggLogger;

  @Pointcut(ContextPointcutAdvice)
  async hello(name: string): Promise<string> {
    return `hello ${name}`;
  }

  async helloEggObjectAop(): Promise<void> {
    this.logger.info('foo');
  }

  // Keep SingletonHello structurally compatible with Hello (the controller assigns
  // singletonHello to a `Hello`-typed variable).
  async helloCross(name: string): Promise<string> {
    return `helloCross ${name}`;
  }
}
