import type { MiddlewareFunc } from 'egg';

import { checkIfIgnore } from '../utils.ts';
import type { SecurityConfig } from '../../types.ts';

// @see http://blogs.msdn.com/b/ieinternals/archive/2009/06/30/internet-explorer-custom-http-headers.aspx
export default (options: SecurityConfig['noopen']): MiddlewareFunc => {
  return async function noopen(ctx, next) {
    await next();

    const opts = {
      ...options,
      ...ctx.securityOptions.noopen,
    };
    if (checkIfIgnore(opts, ctx)) return;

    ctx.set('x-download-options', 'noopen');
  };
};
