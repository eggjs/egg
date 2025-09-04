import http from 'node:http';
import http2 from 'node:http2';
import type { Server } from 'node:net';

import type { H1RequestListener, H2RequestListener, App } from './types.ts';
import { Test } from './test.ts';

export interface RequestOptions {
  http2?: boolean;
}

export class Request {
  app: string | Server;
  #http2 = false;

  constructor(appOrListener: App, options: RequestOptions = {}) {
    if (typeof appOrListener === 'function') {
      if (options.http2) {
        this.#http2 = true;
        this.app = http2.createServer(appOrListener as H2RequestListener); // eslint-disable-line no-param-reassign
      } else {
        this.app = http.createServer(appOrListener as H1RequestListener); // eslint-disable-line no-param-reassign
      }
    } else {
      this.app = appOrListener;
    }
  }

  protected _testRequest(method: string, url: string) {
    const req = new Test(this.app, method.toUpperCase(), url);
    if (this.#http2) {
      req.http2();
    }
    return req;
  }
  delete(url: string) {
    return this._testRequest('delete', url);
  }
  del(url: string) {
    return this._testRequest('delete', url);
  }
  get(url: string) {
    return this._testRequest('get', url);
  }
  head(url: string) {
    return this._testRequest('head', url);
  }
  put(url: string) {
    return this._testRequest('put', url);
  }
  post(url: string) {
    return this._testRequest('post', url);
  }
  patch(url: string) {
    return this._testRequest('patch', url);
  }
  options(url: string) {
    return this._testRequest('options', url);
  }
  trace(url: string) {
    return this._testRequest('trace', url);
  }
}
