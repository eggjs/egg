import { HTTPController, HTTPMethod, HTTPMethodEnum, Middleware, Inject } from '@eggjs/tegg';

import { BarMethodAdvice } from '../../modules/multi-module-common/advice/BarMethodAdvice.js';
import { CountAdvice } from '../../modules/multi-module-common/advice/CountAdvice.js';
import { FooControllerAdvice } from '../../modules/multi-module-common/advice/FooControllerAdvice.js';
import { FooMethodAdvice } from '../../modules/multi-module-common/advice/FooMethodAdvice.js';
import AppService from '../../modules/multi-module-service/AppService.js';

@HTTPController({
  path: '/aop/middleware',
})
@Middleware(CountAdvice, FooControllerAdvice)
export class AopMiddlewareController {
  @Inject()
  appService: AppService;

  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/global',
  })
  // CountAdvice, FooControllerAdvice
  async global() {
    return {
      method: 'global',
    };
  }

  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/method',
  })
  @Middleware(FooMethodAdvice, BarMethodAdvice)
  async middleware() {
    // FooMethodAdvice, BarMethodAdvice, CountAdvice, FooControllerAdvice
    return {
      method: 'middleware',
    };
  }
}
