import { AccessLevel, ContextProto, Inject, SingletonProto } from '@eggjs/tegg';
import { Advice, type AdviceContext, Crosscut, type IAdvice, Pointcut, PointcutType } from '@eggjs/tegg/aop';
import { type EggLogger } from 'egg';

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
  async hello(name: string) {
    return `hello ${name}`;
  }

  async helloEggObjectAop() {
    this.logger.info('foo');
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

@Advice()
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
  async hello(name: string) {
    return `hello ${name}`;
  }

  async helloEggObjectAop() {
    this.logger.info('foo');
  }
}
