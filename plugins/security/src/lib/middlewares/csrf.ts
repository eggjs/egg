import { debuglog } from 'node:util';
import type { Context, Next } from '@eggjs/core';
import typeis from 'type-is';
import { checkIfIgnore } from '../utils.js';
import type { SecurityConfig } from '../../types.js';

const debug = debuglog('@eggjs/security/lib/middlewares/csrf');

export default (options: SecurityConfig['csrf']) => {
  return function csrf(ctx: Context, next: Next) {
    if (checkIfIgnore(options, ctx)) {
      return next();
    }

    // ensure csrf token exists
    if (['any', 'all', 'ctoken'].includes(options.type)) {
      ctx.ensureCsrfSecret();
    }

    // supported requests
    const method = ctx.method;
    let isSupported = false;
    for (const eachRule of options.supportedRequests) {
      if (eachRule.path.test(ctx.path)) {
        if (eachRule.methods.includes(method)) {
          isSupported = true;
          break;
        }
      }
    }
    if (!isSupported) {
      return next();
    }

    if (options.ignoreJSON && typeis.is(ctx.get('content-type'), 'json')) {
      return next();
    }

    const body = ctx.request.body;
    debug('%s %s, got %j', ctx.method, ctx.url, body);
    ctx.assertCsrf();
    return next();
  };
};
