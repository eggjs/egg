import type { MiddlewareFunc } from 'egg';

import { checkIfIgnore } from '../utils.ts';
import type { SecurityConfig } from '../../config/config.default.ts';

// status codes for redirects
// @see https://github.com/jshttp/statuses/blob/master/index.js#L33
const RedirectStatus: Record<number, boolean> = {
  300: true,
  301: true,
  302: true,
  303: true,
  305: true,
  307: true,
  308: true,
};

export default (options: SecurityConfig['nosniff']): MiddlewareFunc => {
  return async function nosniff(ctx, next) {
    await next();

    // ignore redirect response
    if (RedirectStatus[ctx.status]) return;

    const opts = {
      ...options,
      ...ctx.securityOptions.nosniff,
    };
    if (checkIfIgnore(opts, ctx)) return;

    ctx.set('x-content-type-options', 'nosniff');
  };
};
