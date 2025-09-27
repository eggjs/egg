import type { MiddlewareFunc } from 'egg';

import { checkIfIgnore } from '../utils.ts';
import type { SecurityConfig } from '../../types.ts';

// Set Strict-Transport-Security header
export default (options: SecurityConfig['hsts']): MiddlewareFunc => {
  return async function hsts(ctx, next) {
    await next();

    const opts = {
      ...options,
      ...ctx.securityOptions.hsts,
    };
    if (checkIfIgnore(opts, ctx)) return;

    let val = `max-age=${opts.maxAge}`;
    // If opts.includeSubdomains is defined,
    // the rule is also valid for all the sub domains of the website
    if (opts.includeSubdomains) {
      val = `${val}; includeSubdomains`;
    }
    ctx.set('strict-transport-security', val);
  };
};
