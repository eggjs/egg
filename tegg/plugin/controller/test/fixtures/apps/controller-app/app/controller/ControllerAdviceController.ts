import { HTTPController, HTTPMethod, HTTPMethodEnum, Middleware } from '@eggjs/tegg';
import { Pointcut } from '@eggjs/tegg/aop';

import { CatchControllerAdvice } from '../../modules/multi-module-common/advice/CatchControllerAdvice.js';
import { MethodControllerAdvice } from '../../modules/multi-module-common/advice/MethodControllerAdvice.js';
import { ResultPointcutAdvice } from '../../modules/multi-module-common/advice/ResultPointcutAdvice.js';
import { WrapControllerAdvice } from '../../modules/multi-module-common/advice/WrapControllerAdvice.js';

@HTTPController({ path: '/controller-advice' })
@Middleware(WrapControllerAdvice, CatchControllerAdvice)
export class ControllerAdviceController {
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/success' })
  async success(): Promise<object> {
    return { success: true };
  }

  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/error' })
  async error(): Promise<void> {
    throw new Error('controller advice error');
  }

  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/timeout', timeout: 20 })
  async timeout(): Promise<object> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return { success: true };
  }

  @Pointcut(ResultPointcutAdvice)
  @Middleware(MethodControllerAdvice)
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/pointcut' })
  async pointcut(): Promise<object> {
    return { success: true };
  }
}
