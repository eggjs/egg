import { AccessLevel } from '@eggjs/tegg-types';
import { Advice, type AdviceContext, type IAdvice } from '@eggjs/tegg/aop';

@Advice({
  accessLevel: AccessLevel.PUBLIC,
})
export class CountAdvice implements IAdvice {
  private index = 0;

  async around(_ctx: AdviceContext, next: () => Promise<any>) {
    const body = await next();
    if (body) body.count = this.index++;
    body.aopList = body.aopList || [];
    body.aopList.push(CountAdvice.name);
    return body;
  }
}
