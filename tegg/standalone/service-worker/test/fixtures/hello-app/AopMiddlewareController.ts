import { HTTPController, HTTPMethod, HTTPMethodEnum, Middleware } from '@eggjs/tegg';

import { ErrorControllerAdvice } from './ErrorControllerAdvice.ts';
import { FooControllerAdvice } from './FooControllerAdvice.ts';

@HTTPController({ path: '/aop-mw' })
@Middleware(FooControllerAdvice, ErrorControllerAdvice)
export class AopMiddlewareController {
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/aop' })
  async aop() {
    return { msg: 'hello' };
  }

  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/error' })
  async error() {
    throw new Error('mock error');
  }
}
