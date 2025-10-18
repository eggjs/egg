import { HTTPMethodEnum, type IAdvice, ObjectInitType } from '@eggjs/tegg-types';
import { Advice } from '@eggjs/aop-decorator';

import { Middleware, HTTPController, HTTPMethod } from '../../src/index.ts';

@Advice({
  initType: ObjectInitType.SINGLETON,
})
export class FooAdvice implements IAdvice {
  async beforeCall(): Promise<void> {
    // ...
  }
}

@Advice({
  initType: ObjectInitType.SINGLETON,
})
export class BarAdvice implements IAdvice {
  async beforeCall(): Promise<void> {
    // ...
  }
}

@Advice({
  initType: ObjectInitType.SINGLETON,
})
export class FooMethodAdvice implements IAdvice {
  async beforeCall(): Promise<void> {
    // ...
  }
}

@Advice({
  initType: ObjectInitType.SINGLETON,
})
export class BarMethodAdvice implements IAdvice {
  async beforeCall(): Promise<void> {
    // ...
  }
}

@Middleware(FooAdvice, BarAdvice)
@HTTPController()
export class AopMiddlewareController {
  @Middleware(FooMethodAdvice, BarMethodAdvice)
  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/hello',
  })
  async hello(): Promise<void> {
    return;
  }

  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/bye',
  })
  async bye(): Promise<void> {
    return;
  }
}
