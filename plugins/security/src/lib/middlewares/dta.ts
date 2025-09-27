import type { MiddlewareFunc } from 'egg';
import { isSafePath } from '../utils.ts';

// https://en.wikipedia.org/wiki/Directory_traversal_attack
export default (): MiddlewareFunc => {
  return function dta(ctx, next) {
    const path = ctx.path;
    if (!isSafePath(path, ctx)) {
      ctx.throw(400);
    }
    return next();
  };
};
