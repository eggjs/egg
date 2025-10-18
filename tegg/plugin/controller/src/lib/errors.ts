import { TeggError } from '@eggjs/tegg-metadata';

enum ErrorCodes {
  ROUTER_CONFLICT = 'ROUTER_CONFLICT',
}

/** 路由冲突错误 */
export class RouterConflictError extends TeggError {
  constructor(msg: string) {
    super(msg, ErrorCodes.ROUTER_CONFLICT);
  }
}
