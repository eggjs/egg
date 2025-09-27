import type { Context, Next } from '@eggjs/core';
import { isSafePath } from '../utils.js';

// https://en.wikipedia.org/wiki/Directory_traversal_attack
export default () => {
  return function dta(ctx: Context, next: Next) {
    const path = ctx.path;
    if (!isSafePath(path, ctx)) {
      ctx.throw(400);
    }
    return next();
  };
};
