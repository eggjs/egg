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
  }
  // NOTE: don't emit the `server` event here. egg core registers its
  // `once('server', ...)` listener inside `Application.load()` (during
  // `app.ready()`), so emitting at server-creation time (before ready) would be
  // missed and `onServer` (clientError logging / graceful / timeout / websocket)
  // never runs. The caller emits `server` after `app.ready()` instead — just
  // like @eggjs/cluster, which emits it after the app is ready.
  return server;
}
