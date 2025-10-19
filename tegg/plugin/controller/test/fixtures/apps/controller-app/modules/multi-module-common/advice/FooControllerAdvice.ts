import { Advice, type AdviceContext, type IAdvice } from '@eggjs/tegg/aop';
import { AccessLevel } from '@eggjs/tegg-types';

@Advice({
  accessLevel: AccessLevel.PUBLIC,
})
export class FooControllerAdvice implements IAdvice {
  async around(_ctx: AdviceContext, next: () => Promise<any>) {
    const body = await next();
    body.aopList = body.aopList || [];
    body.aopList.push(FooControllerAdvice.name);
    return body;
  }
}
