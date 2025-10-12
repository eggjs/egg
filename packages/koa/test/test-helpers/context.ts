import stream from 'node:stream';

import { Application as Koa, type Context } from '../../src/application.ts';
import type { Request } from '../../src/request.ts';
import type { Response } from '../../src/response.ts';

// oxlint-disable-next-line typescript/no-explicit-any
export default function context(req?: any, res?: any, app?: Koa): Context {
  const socket = new stream.Duplex();
  req = { headers: {}, socket, ...stream.Readable.prototype, ...req };
  res = { _headers: {}, socket, ...stream.Writable.prototype, ...res };
  req.socket.remoteAddress = req.socket.remoteAddress || '127.0.0.1';
  app = app || new Koa();
  res.getHeader = (k: string) => res._headers[k.toLowerCase()];
  res.hasHeader = (k: string) => k.toLowerCase() in res._headers;
  res.setHeader = (k: string, v: string | string[]) => {
    res._headers[k.toLowerCase()] = v;
  };
  res.removeHeader = (k: string) => {
    // oxlint-disable-next-line no-dynamic-delete
    delete res._headers[k.toLowerCase()];
  };
  res.getHeaders = () => res._headers;
  return app.createContext(req, res);
}

export function request(...args: unknown[]): Request {
  return context(...args).request;
}

export function response(...args: unknown[]): Response {
  return context(...args).response;
}
