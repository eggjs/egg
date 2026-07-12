import { AccessLevel, SingletonProto } from '@eggjs/tegg';
import { Advice, type AdviceContext, type IAdvice, Pointcut } from '@eggjs/tegg/aop';

@Advice()
export class ModuleJsonAdvice implements IAdvice<AopService> {
  async around(context: AdviceContext<AopService>, next: () => Promise<string>): Promise<string> {
    context.args[0] = `advised:${context.args[0]}`;
    return await next();
  }
}

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export class AopService {
  @Pointcut(ModuleJsonAdvice)
  async greet(name: string): Promise<string> {
    return `hello ${name}`;
  }
}
