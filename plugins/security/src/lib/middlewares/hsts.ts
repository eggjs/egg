import type { Context, Next } from '@eggjs/core';
import { checkIfIgnore } from '../utils.js';
import type { SecurityConfig } from '../../types.js';

// Set Strict-Transport-Security header
export default (options: SecurityConfig['hsts']) => {
  return async function hsts(ctx: Context, next: Next) {
    await next();

    const opts = {
      ...options,
      ...ctx.securityOptions.hsts,
    };
    if (checkIfIgnore(opts, ctx)) return;

    let val = 'max-age=' + opts.maxAge;
    // If opts.includeSubdomains is defined,
    // the rule is also valid for all the sub domains of the website
    if (opts.includeSubdomains) {
      val += '; includeSubdomains';
    }
    ctx.set('strict-transport-security', val);
  };
};
