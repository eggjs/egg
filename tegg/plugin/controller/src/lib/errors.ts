import { TeggError } from '@eggjs/metadata';

const ErrorCodes = {
  ROUTER_CONFLICT: 'ROUTER_CONFLICT',
} as const;
type ErrorCodes = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/** 路由冲突错误 */
export class RouterConflictError extends TeggError {
  constructor(msg: string) {
    super(msg, ErrorCodes.ROUTER_CONFLICT);
  }
}
