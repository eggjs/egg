import { METHODS } from 'node:http';
import type { Context, Next } from '@eggjs/core';

const METHODS_NOT_ALLOWED = ['TRACE', 'TRACK'];
const safeHttpMethodsMap: Record<string, boolean> = {};

for (const method of METHODS) {
  if (!METHODS_NOT_ALLOWED.includes(method)) {
    safeHttpMethodsMap[method.toUpperCase()] = true;
  }
}

// https://www.owasp.org/index.php/Cross_Site_Tracing
// http://jsperf.com/find-by-map-with-find-by-array
export default () => {
  return function notAllow(ctx: Context, next: Next) {
    // ctx.method is upper case
    if (!safeHttpMethodsMap[ctx.method]) {
      ctx.throw(405);
    }
    return next();
  };
};
