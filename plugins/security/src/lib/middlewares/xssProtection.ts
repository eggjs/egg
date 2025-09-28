import type { MiddlewareFunc } from 'egg';

import { checkIfIgnore } from '../utils.ts';
import type { SecurityConfig } from '../../config/config.default.ts';

export default (options: SecurityConfig['xssProtection']): MiddlewareFunc => {
  return async function xssProtection(ctx, next) {
    await next();

    const opts = {
      ...options,
      ...ctx.securityOptions.xssProtection,
    };
    if (checkIfIgnore(opts, ctx)) return;

    ctx.set('x-xss-protection', opts.value);
  };
};
