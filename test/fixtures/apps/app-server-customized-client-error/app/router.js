'use strict';

module.exports = app => {
  let server;
  app.on('server', srv => { server = srv; });

  app.get('/', function* () {
    this.body = this.app.serverEmit;
  });

  app.get('/client_error', async ctx => {
    server.emit('clientError', new Error('test'), ctx.req.socket);
  });
};
