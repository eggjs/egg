import { ObjectInitType } from '@eggjs/tegg-types';
import { Advice, type AdviceContext, type IAdvice } from '@eggjs/tegg/aop';

@Advice({ initType: ObjectInitType.CONTEXT })
export class CtxCountAdvice implements IAdvice {
  // Per-context instance: a fresh advice object per request keeps this at 1.
  // A singleton would leak across requests and increment.
  #calls = 0;

  async around(_ctx: AdviceContext, next: () => Promise<any>): Promise<any> {
    const res = await next();
    res.ctxCount = ++this.#calls;
    return res;
  }
}
