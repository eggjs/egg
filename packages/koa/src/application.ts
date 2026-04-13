import type { AsyncLocalStorage } from 'node:async_hooks';
import Emitter from 'node:events';
import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import Stream from 'node:stream';
import util, { debuglog } from 'node:util';
import v8 from 'node:v8';

import { getAsyncLocalStorage } from 'gals';
import { HttpError } from 'http-errors';
import { isGeneratorFunction } from 'is-type-of';
import compose from 'koa-compose';
import onFinished from 'on-finished';
import statuses from 'statuses';

import { Context } from './context.ts';
import { Request } from './request.ts';
import { Response } from './response.ts';
import type { CustomError, AnyProto } from './types.ts';

// Re-export for external use
export { Context, Request, Response };

const debug = debuglog('egg/koa/application');

// oxlint-disable-next-line typescript/no-explicit-any
export type ProtoImplClass<T = object> = new (...args: any[]) => T;
export type Next = () => Promise<void>;
type _MiddlewareFunc<T> = (ctx: T, next: Next) => Promise<void> | void;
export type MiddlewareFunc<T extends Context = Context> = _MiddlewareFunc<T> & {
  _name?: string;
};

/**
 * Expose `Application` class.
 * Inherits from `Emitter.prototype`.
 */
export class Application extends Emitter {
  [key: symbol]: unknown;
  /**
   * Make HttpError available to consumers of the library so that consumers don't
   * have a direct dependency upon `http-errors`
   */
  static HttpError: typeof HttpError = HttpError;

  protected _proxy: boolean;
  protected _env: string;
  subdomainOffset: number;
  proxyIpHeader: string;
  maxIpsCount: number;
  protected _keys?: string[];
  middleware: MiddlewareFunc<Context>[];
  ctxStorage: AsyncLocalStorage<Context> | null;
  silent: boolean;
  ContextClass: ProtoImplClass<Context>;
  context: AnyProto;
  RequestClass: ProtoImplClass<Request>;
  request: AnyProto;
  ResponseClass: ProtoImplClass<Response>;
  response: AnyProto;

  /**
   * Initialize a new `Application`.
   *
   * @param {object} [options] Application options
   * @param {string} [options.env] Environment, default is `development`
   * @param {string[]} [options.keys] Signed cookie keys
   * @param {boolean} [options.proxy] Trust proxy headers
   * @param {number} [options.subdomainOffset] Subdomain offset
   * @param {string} [options.proxyIpHeader] Proxy IP header, defaults to X-Forwarded-For
   * @param {number} [options.maxIpsCount] Max IPs read from proxy IP header, default to 0 (means infinity)
   */

  constructor(options?: {
    proxy?: boolean;
    subdomainOffset?: number;
    proxyIpHeader?: string;
    maxIpsCount?: number;
    env?: string;
    keys?: string[];
  }) {
    super();
    options = options || {};
    this._proxy = options.proxy || false;
    this.subdomainOffset = options.subdomainOffset || 2;
    this.proxyIpHeader = options.proxyIpHeader || 'X-Forwarded-For';
    this.maxIpsCount = options.maxIpsCount || 0;
    this._env = options.env || process.env.NODE_ENV || 'development';
    if (options.keys) {
      this._keys = options.keys;
    }
    this.middleware = [];
    if (v8.startupSnapshot?.isBuildingSnapshot?.()) {
      this.ctxStorage = null;
      v8.startupSnapshot.addDeserializeCallback((app: Application) => {
        app.ctxStorage = getAsyncLocalStorage();
      }, this);
    } else {
      this.ctxStorage = getAsyncLocalStorage();
    }
    this.silent = false;
    this.ContextClass = class ApplicationContext extends Context {} as ProtoImplClass<Context>;
    this.context = this.ContextClass.prototype;
    this.RequestClass = class ApplicationRequest extends Request {} as ProtoImplClass<Request>;
    this.request = this.RequestClass.prototype;
    this.ResponseClass = class ApplicationResponse extends Response {} as ProtoImplClass<Response>;
    this.response = this.ResponseClass.prototype;
    // Set up custom inspect
    this[util.inspect.custom] = this.inspect.bind(this);
  }

  get keys() {
    return this._keys;
  }

  set keys(value: string[] | undefined) {
    this._keys = value;
  }

  get env() {
    return this._env;
  }
  set env(value: string) {
    this._env = value;
  }

  get proxy() {
    return this._proxy;
  }
  set proxy(value: boolean) {
    this._proxy = value;
  }

  /**
   * Shorthand for:
   *
   *    http.createServer(app.callback()).listen(...)
   */
  // oxlint-disable-next-line typescript/no-explicit-any
  listen(...args: any[]): http.Server {
    debug('listen with args: %o', args);
    const server = http.createServer(this.callback());
    return server.listen(...args);
  }

  /**
   * Return JSON representation.
   * We only bother showing settings.
   */
  toJSON(): object {
    return {
      subdomainOffset: this.subdomainOffset,
      proxy: this.proxy,
      env: this.env,
    };
  }

  /**
   * Inspect implementation.
   */
  inspect(): object {
    return this.toJSON();
  }

  /**
   * Use the given middleware `fn`.
   */
  use<T extends Context = Context>(fn: MiddlewareFunc<T>): this {
    if (typeof fn !== 'function') throw new TypeError('middleware must be a function!');
    const name = fn._name || fn.name || '-';
    if (isGeneratorFunction(fn)) {
      throw new TypeError(
        `Support for generators was removed, middleware: ${name}. ` +
          'See the documentation for examples of how to convert old middleware ' +
          'https://github.com/koajs/koa/blob/master/docs/migration.md',
      );
    }
    debug('use %o #%d', name, this.middleware.length);
    this.middleware.push(fn as MiddlewareFunc<Context>);
    return this;
  }

  /**
   * Return a request handler callback
   * for node's native http server.
   */
  callback(): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
    const fn = compose(this.middleware);

    if (!this.listenerCount('error')) {
      this.on('error', this.onerror.bind(this));
    }

    const handleRequest = (req: IncomingMessage, res: ServerResponse) => {
      const ctx = this.createContext(req, res);
      if (this.ctxStorage) {
        return this.ctxStorage.run(ctx, async () => {
          return await this.handleRequest(ctx, fn);
        });
      }
      return this.handleRequest(ctx, fn);
    };

    return handleRequest;
  }

  /**
   * return current context from async local storage
   */
  get currentContext(): Context | undefined {
    return this.ctxStorage?.getStore();
  }

  /**
   * Handle request in callback.
   * @private
   */
  protected async handleRequest(ctx: Context, fnMiddleware: (ctx: Context) => Promise<void>): Promise<void> {
    this.emit('request', ctx);
    const res = ctx.res;
    res.statusCode = 404;
    const onerror = (err: CustomError) => ctx.onerror(err);
    // oxlint-disable-next-line promise/prefer-await-to-callbacks
    onFinished(res, (err: CustomError | null) => {
      if (err) {
        onerror(err);
      }
      this.emit('response', ctx);
    });
    try {
      await fnMiddleware(ctx);
      return this._respond(ctx);
    } catch (err) {
      return onerror(err as CustomError);
    }
  }

  /**
   * Initialize a new context.
   * @private
   */
  createContext(req: IncomingMessage, res: ServerResponse): Context {
    const context = new this.ContextClass(this, req, res);
    return context;
  }

  /**
   * Default error handler.
   * @private
   */
  protected onerror(err: CustomError): void {
    // When dealing with cross-globals a normal `instanceof` check doesn't work properly.
    // See https://github.com/koajs/koa/issues/1466
    // We can probably remove it once jest fixes https://github.com/facebook/jest/issues/2549.
    const isNativeError = err instanceof Error || Object.prototype.toString.call(err) === '[object Error]';
    if (!isNativeError) throw new TypeError(util.format('non-error thrown: %j', err));

    if (err.status === 404 || err.expose) return;
    if (this.silent) return;

    const msg = err.stack || err.toString();
    // oxlint-disable-next-line no-console
    console.error(`\n${msg.replaceAll(/^/gm, '  ')}\n`);
  }

  /**
   * Response helper.
   */
  protected _respond(ctx: Context): void {
    // allow bypassing koa
    if (ctx.respond === false) return;

    if (!ctx.writable) return;

    const res = ctx.res;
    let body = ctx.body;
    const code = ctx.status;

    // ignore body
    if (statuses.empty[code]) {
      // strip headers
      ctx.body = null;
      res.end();
      return;
    }

    if (ctx.method === 'HEAD') {
      if (!res.headersSent && !ctx.response.has('Content-Length')) {
        const { length } = ctx.response;
        if (Number.isInteger(length)) ctx.length = length;
      }
      res.end();
      return;
    }

    // status body
    if (body === null || body === undefined) {
      if (ctx.response._explicitNullBody) {
        ctx.response.remove('Content-Type');
        ctx.response.remove('Transfer-Encoding');
        res.end();
        return;
      }
      if (ctx.req.httpVersionMajor >= 2) {
        body = String(code);
      } else {
        body = ctx.message || String(code);
      }
      if (!res.headersSent) {
        ctx.type = 'text';
        ctx.length = Buffer.byteLength(body);
      }
      res.end(body);
      return;
    }

    // responses
    if (Buffer.isBuffer(body)) {
      res.end(body);
      return;
    }
    if (typeof body === 'string') {
      res.end(body);
      return;
    }
    if (body instanceof Stream) {
      body.pipe(res);
      return;
    }

    // body: json
    body = JSON.stringify(body);
    if (!res.headersSent) {
      ctx.length = Buffer.byteLength(body);
    }
    res.end(body);
  }
}
