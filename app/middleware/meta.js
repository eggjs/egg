/**
 * meta middleware, should be the first middleware
 */

'use strict';

module.exports = () => {
  return async function meta(ctx, next) {
    await next();
    // total response time header
    ctx.set('x-readtime', Date.now() - ctx.starttime);
  };
};
