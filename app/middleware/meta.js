/**
 * meta middleware, should be the first middleware
 */

const { performance } = require('perf_hooks');

module.exports = options => {
  return async function meta(ctx, next) {
    if (options.logging) {
      ctx.coreLogger.info('[meta] request started, host: %s, user-agent: %s', ctx.host, ctx.header['user-agent']);
    }
    await next();
    // total response time header
    if (ctx.performanceStarttime) {
      ctx.set('x-readtime', Math.floor((performance.now() - ctx.performanceStarttime) * 1000) / 1000);
    } else {
      ctx.set('x-readtime', Date.now() - ctx.starttime);
    }
  };
};
