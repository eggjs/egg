import { Advice, type AdviceContext, Crosscut, type IAdvice, PointcutType } from '@eggjs/tegg/aop';

import { Hello } from '../aop-module/Hello.js';

// This advice lives in a different module (loadUnit) than its target `Hello`.
// `Hello`'s loadUnit is built before this module's advice is registered, so it
// exercises the cross-loadUnit crosscut weaving path (the GlobalGraph build hook).
@Crosscut({
  type: PointcutType.CLASS,
  clazz: Hello,
  methodName: 'helloCross',
})
@Advice()
export class CrossModuleAdvice implements IAdvice<Hello> {
  async around(ctx: AdviceContext<Hello>, block: () => Promise<any>): Promise<any> {
    ctx.args[0] = `withCrossModuleParam(${ctx.args[0]})`;
    const result = await block();
    return `withCrossModuleResult(${result})`;
  }
}
