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
  // Mock startup emits `server` once after app.ready(). HTTP requests also use
  // this helper to get the cached server and must not emit the event again.
  return server;
}
