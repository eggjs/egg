import { ObjectInitType } from '@eggjs/tegg-types';
import { Advice, type AdviceContext, type IAdvice } from '@eggjs/tegg/aop';

@Advice({ initType: ObjectInitType.SINGLETON })
export class CountControllerAdvice implements IAdvice {
  async around(_ctx: AdviceContext, next: () => Promise<any>): Promise<any> {
    const res = await next();
    res.count = 0;
    return res;
  }
}
