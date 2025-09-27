import type { Context, Next } from '@eggjs/core';
import { checkIfIgnore } from '../utils.js';
import type { SecurityConfig } from '../../types.js';

export default (options: SecurityConfig['xframe']) => {
  return async function xframe(ctx: Context, next: Next) {
    await next();

    const opts = {
      ...options,
      ...ctx.securityOptions.xframe,
    };
    if (checkIfIgnore(opts, ctx)) return;

    // DENY, SAMEORIGIN, ALLOW-FROM
    // https://developer.mozilla.org/en-US/docs/HTTP/X-Frame-Options?redirectlocale=en-US&redirectslug=The_X-FRAME-OPTIONS_response_header
    const value = opts.value || 'SAMEORIGIN';
    ctx.set('x-frame-options', value);
  };
};
