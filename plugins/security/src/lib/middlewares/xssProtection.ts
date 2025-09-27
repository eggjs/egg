import type { Context, Next } from '@eggjs/core';
import { checkIfIgnore } from '../utils.js';
import type { SecurityConfig } from '../../types.js';

export default (options: SecurityConfig['xssProtection']) => {
  return async function xssProtection(ctx: Context, next: Next) {
    await next();

    const opts = {
      ...options,
      ...ctx.securityOptions.xssProtection,
    };
    if (checkIfIgnore(opts, ctx)) return;

    ctx.set('x-xss-protection', opts.value);
  };
};
