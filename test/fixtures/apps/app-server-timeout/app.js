'use strict';

module.exports = app => {
  app.messenger.on('egg-ready', () => {
    // https://github.com/eggjs/egg/pull/3222
    app.server.on('timeout', socket => {
      const req = socket.parser.incoming;
      if (req && socket._httpMessage) {
        app.coreLogger.warn('[http_server] A request `%s %s` timeout with client (%s:%d)', req.method, req.url, socket.remoteAddress, socket.remotePort);
      }
      socket.destroy();
    });
  });
};