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

    // try to support Keep-Alive Header
    const server = ctx.app.server;
    if (server && server.keepAliveTimeout && server.keepAliveTimeout >= 1000 && ctx.header.connection !== 'close') {
      /**
       * use Math.floor instead of parseInt. More: https://github.com/eggjs/egg/pull/2702
       */
      const timeout = Math.floor(server.keepAliveTimeout / 1000);
      ctx.set('keep-alive', `timeout=${timeout}`);
    }
  };
};
