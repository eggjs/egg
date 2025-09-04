import http from 'node:http';
import http2 from 'node:http2';
import type { Server } from 'node:net';

import { agent as Agent } from 'superagent';

import { Test } from './test.ts';
import type {
  AgentOptions,
  H1RequestListener,
  H2RequestListener,
  App,
} from './types.ts';

/**
 * Initialize a new `TestAgent`.
 *
 * @param {Function|Server} app
 * @param {Object} options
 */

export class TestAgent extends Agent {
  app: Server | string;
  _host: string;
  #http2 = false;

  constructor(appOrListener: App, options: AgentOptions = {}) {
    super(options);
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

  // set a host name
  host(host: string) {
    this._host = host;
    return this;
  }

  // TestAgent.prototype.del = TestAgent.prototype.delete;

  protected _testRequest(method: string, url: string) {
    const req = new Test(this.app, method.toUpperCase(), url);
    if (this.#http2) {
      req.http2();
    }

    if (this._host) {
      req.set('host', this._host);
    }

    const that = this as any;
    // access not internal methods
    req.on('response', that._saveCookies.bind(this));
    req.on('redirect', that._saveCookies.bind(this));
    req.on('redirect', that._attachCookies.bind(this, req));
    that._setDefaults(req);
    that._attachCookies(req);

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

// allow keep use by `agent()`
export const proxyAgent = new Proxy(TestAgent, {
  apply(target, _, argumentsList) {
    return new target(argumentsList[0], argumentsList[1]);
  },
});
