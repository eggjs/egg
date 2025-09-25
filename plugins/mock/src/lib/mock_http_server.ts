import http, { Server } from 'node:http';

const SERVER = Symbol('http_server');

export function createServer(app: any): Server {
  let server = app[SERVER] || app.callback();
  if (typeof server === 'function') {
    server = http.createServer(server);
    // cache server, avoid create many times
    app[SERVER] = server;
    if (!app.server) {
      app.server = server;
    }
    // emit server event just like egg-cluster does
    // https://github.com/eggjs/egg-cluster/blob/master/lib/app_worker.js#L52
    app.emit('server', server);
  }
  return server;
}
