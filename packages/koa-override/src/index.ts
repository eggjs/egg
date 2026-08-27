import { METHODS } from 'node:http';

import type { Context, MiddlewareFunc } from '@eggjs/koa';

const methods = METHODS.map((method) => method.toUpperCase());

export interface OverrideMiddlewareOptions {
  /** Request methods that may be overridden. Defaults to `[ 'POST' ]`. */
  allowedMethods?: string[];
}

interface RequestWithBody {
  method: string;
  body?: {
    _method?: unknown;
  };
}

export default function override(options: OverrideMiddlewareOptions = {}): MiddlewareFunc {
  const allowedMethods = options.allowedMethods ?? ['POST'];

  return function overrideMethod(ctx: Context, next): Promise<void> {
    const request = ctx.request as RequestWithBody;
    if (!allowedMethods.includes(request.method)) {
      return next();
    }

    let method: string | undefined;
    if (typeof request.body?._method === 'string' && request.body._method) {
      method = request.body._method.toUpperCase();
    } else {
      const header = ctx.get('x-http-method-override');
      if (typeof header === 'string' && header) {
        method = header.toUpperCase();
      }
    }

    if (method) {
      if (!methods.includes(method)) {
        ctx.throw(400, `invalid override method: "${method}"`);
      }
      request.method = method;
    }

    return next();
  };
}
