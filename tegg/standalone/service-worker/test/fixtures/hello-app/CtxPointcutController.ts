import { HTTPController, HTTPMethod, HTTPMethodEnum } from '@eggjs/tegg';
import { Pointcut } from '@eggjs/tegg/aop';

import { CtxCountAdvice } from './CtxCountAdvice.ts';

@HTTPController({ path: '/ctxpc' })
export class CtxPointcutController {
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/run' })
  @Pointcut(CtxCountAdvice)
  async run() {
    return { msg: 'hello' };
  }
}
