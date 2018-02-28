/**
 * meta middleware, should be the first middleware
 */

'use strict';

module.exports = () => {
  return function* meta(next) {
    yield next;
    // total response time header
    ctx.set('x-readtime', Date.now() - ctx.starttime);

    // try to support Keep-Alive Header
    const server = ctx.app.server;
    if (server && server.keepAliveTimeout && server.keepAliveTimeout >= 1000 && ctx.header.connection !== 'close') {
      const timeout = parseInt(server.keepAliveTimeout / 1000);
      ctx.set('keep-alive', `timeout=${timeout}`);
    }
  };
};
