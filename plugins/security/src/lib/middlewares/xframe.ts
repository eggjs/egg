import type { MiddlewareFunc } from 'egg';

import { checkIfIgnore } from '../utils.ts';
import type { SecurityConfig } from '../../types.ts';

export default (options: SecurityConfig['xframe']): MiddlewareFunc => {
  return async function xframe(ctx, next) {
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
