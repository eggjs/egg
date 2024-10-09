/**
 * meta middleware, should be the first middleware
 */

import { performance } from 'node:perf_hooks';
import type { EggCoreContext } from '@eggjs/core';
import type { Next } from '../../lib/type.js';

export interface MetaMiddlewareOptions {
  enable: boolean;
  logging: boolean;
}

export default (options: MetaMiddlewareOptions) => {
  return async function meta(ctx: EggCoreContext, next: Next) {
    if (options.logging) {
      ctx.coreLogger.info('[meta] request started, host: %s, user-agent: %s',
        ctx.host, ctx.header['user-agent']);
    }
    await next();
    // total response time header
    if (ctx.performanceStarttime) {
      ctx.set('x-readtime', Math.floor((performance.now() - ctx.performanceStarttime) * 1000) / 1000);
    } else {
      ctx.set('x-readtime', Date.now() - ctx.starttime);
    }
  };
};
