/**
 * meta middleware, should be the first middleware
 */

'use strict';

module.exports = options => {
  return async function meta(ctx, next) {
    if (options.logging) {
      ctx.coreLogger.info('[meta] request started, host: %s, user-agent: %s', ctx.host, ctx.header['user-agent']);
    }
    await next();
    // total response time header
    ctx.set('x-readtime', Date.now() - ctx.starttime);
  };
};
