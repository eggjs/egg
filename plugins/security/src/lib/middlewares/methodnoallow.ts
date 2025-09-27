import { METHODS } from 'node:http';

import type { MiddlewareFunc } from 'egg';

const METHODS_NOT_ALLOWED = ['TRACE', 'TRACK'];
const safeHttpMethodsMap: Record<string, boolean> = {};

for (const method of METHODS) {
  if (!METHODS_NOT_ALLOWED.includes(method)) {
    safeHttpMethodsMap[method.toUpperCase()] = true;
  }
}

// https://www.owasp.org/index.php/Cross_Site_Tracing
// http://jsperf.com/find-by-map-with-find-by-array
export default (): MiddlewareFunc => {
  return function notAllow(ctx, next) {
    // ctx.method is upper case
    if (!safeHttpMethodsMap[ctx.method]) {
      ctx.throw(405);
    }
    return next();
  };
};
