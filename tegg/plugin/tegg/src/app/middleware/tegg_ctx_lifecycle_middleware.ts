import type { MiddlewareFunc } from 'egg';

import { ctxLifecycleMiddleware } from '../../lib/ctx_lifecycle_middleware.ts';

export default (): MiddlewareFunc => {
  return ctxLifecycleMiddleware;
};
