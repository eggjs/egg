import { HTTPController, HTTPMethod, HTTPMethodEnum, Middleware, Inject } from '@eggjs/tegg';
import AppService from '../../modules/multi-module-service/AppService.js';
import { countMw } from '../middleware/count_mw.js';
import { logMwFactory } from '../middleware/log_mw.js';
import { callModuleCtx } from '../middleware/call_module.js';

@HTTPController({
  path: '/middleware',
})
@Middleware(countMw)
export class MiddlewareController {
  @Inject()
  appService: AppService;

  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/global',
  })
  async global() {
    return {};
  }

  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/method',
  })
  @Middleware(logMwFactory('use middleware'))
  async middleware() {
    return {};
  }

  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/methodCallModule',
  })
  @Middleware(callModuleCtx)
  async middlewareCallModule() {
    return {};
  }
}
