import { HTTPController, HTTPMethod, HTTPMethodEnum, Middleware } from '@eggjs/tegg';

import { CountAdvice } from '../multi-module-common/advice/CountAdvice.js';
import { FooMethodAdvice } from '../multi-module-common/advice/FooMethodAdvice.js';

@HTTPController({
  path: '/module/aop/middleware',
})
@Middleware(CountAdvice)
export class CrossModuleMiddlewareController {
  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/global',
  })
  // CountAdvice
  async global() {
    return {
      method: 'moduleGlobal',
    };
  }

  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/method',
  })
  @Middleware(FooMethodAdvice)
  // FooMethodAdvice, CountAdvice
  async method() {
    return {
      method: 'moduleMethod',
    };
  }
}
