import type { Context, Next } from '@eggjs/core';
import { checkIfIgnore } from '../utils.js';
import type { SecurityConfig } from '../../types.js';

// @see http://blogs.msdn.com/b/ieinternals/archive/2009/06/30/internet-explorer-custom-http-headers.aspx
export default (options: SecurityConfig['noopen']) => {
  return async function noopen(ctx: Context, next: Next) {
    await next();

    const opts = {
      ...options,
      ...ctx.securityOptions.noopen,
    };
    if (checkIfIgnore(opts, ctx)) return;

    ctx.set('x-download-options', 'noopen');
  };
};
