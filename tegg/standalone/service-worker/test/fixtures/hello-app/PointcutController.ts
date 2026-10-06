import { HTTPController, HTTPMethod, HTTPMethodEnum } from '@eggjs/tegg';
import { Pointcut } from '@eggjs/tegg/aop';

import { CountControllerAdvice } from './CountControllerAdvice.ts';

@HTTPController({ path: '/pc' })
export class PointcutController {
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/run' })
  @Pointcut(CountControllerAdvice)
  async pc() {
    return { msg: 'hello' };
  }
}
