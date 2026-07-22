import { HTTPController, HTTPMethod, HTTPMethodEnum, Middleware } from '@eggjs/tegg';
import { Pointcut } from '@eggjs/tegg/aop';

import { CountControllerAdvice } from './CountControllerAdvice.ts';
import { FooControllerAdvice } from './FooControllerAdvice.ts';

@HTTPController({ path: '/combo' })
@Middleware(FooControllerAdvice)
export class ComboController {
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/run' })
  @Pointcut(CountControllerAdvice)
  async run() {
    return { msg: 'hello' };
  }
}
