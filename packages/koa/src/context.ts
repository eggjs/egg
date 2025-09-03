import util from 'node:util';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ParsedUrlQuery } from 'node:querystring';

import createError from 'http-errors';
import statuses from 'statuses';
import Cookies from 'cookies';
import type { Accepts } from 'accepts';

import type { Application } from './application.ts';
import type { Request } from './request.ts';
import type { Response } from './response.ts';
import type { CustomError, AnyProto } from './types.ts';

export class Context {
  [key: symbol | string]: unknown;
  app: Application;
  req: IncomingMessage;
  res: ServerResponse;
  request: Request & AnyProto;
  response: Response & AnyProto;
  originalUrl: string;
  respond?: boolean;
  // oxlint-disable-next-line typescript/no-explicit-any
  #state: Record<string, any> = {};

  constructor(app: Application, req: IncomingMessage, res: ServerResponse) {
    this.app = app;
    this.req = req;
    this.res = res;
    this.request = new app.RequestClass(app, this, req, res);
    this.response = new app.ResponseClass(app, this, req, res);
    this.request.response = this.response;
    this.response.request = this.request;
    this.originalUrl = req.url ?? '/';
  }

  /**
   * util.inspect() implementation, which
   * just returns the JSON output.
   */
  inspect() {
    return this.toJSON();
  }

  /**
   * Custom inspection implementation for newer Node.js versions.
   */
  [util.inspect.custom]() {
    return this.inspect();
  }

  /**
   * Return JSON representation.
   *
   * Here we explicitly invoke .toJSON() on each
   * object, as iteration will otherwise fail due
   * to the getters and cause utilities such as
   * clone() to fail.
   */

  toJSON() {
    return {
      request: this.request.toJSON(),
      response: this.response.toJSON(),
      app: this.app.toJSON(),
      originalUrl: this.originalUrl,
      req: '<original node req>',
      res: '<original node res>',
      socket: '<original node socket>',
    };
  }

  /**
   * Similar to .throw(), adds assertion.
   *
   * ```ts
   * this.assert(this.user, 401, 'Please login!');
   * ```
   */
  assert(
    value: unknown,
    status?: number,
    errorProps?: Record<string, unknown>
  ): void;
  assert(
    value: unknown,
    status?: number,
    errorMessage?: string,
    errorProps?: Record<string, unknown>
  ): void;
  assert(
    value: unknown,
    status?: number,
    errorMessageOrProps?: string | Record<string, unknown>,
    errorProps?: Record<string, unknown>
  ) {
    if (value) {
      return;
    }
    status = status ?? 500;
    if (typeof errorMessageOrProps === 'string') {
      // assert(value, status, errorMessage, errorProps?)
      throw createError(status, errorMessageOrProps, errorProps ?? {});
    }
    // assert(value, status, errorProps?)
    throw createError(status, errorMessageOrProps ?? {});
  }

  /**
   * Throw an error with `status` (default 500) and
   * `msg`. Note that these are user-level
   * errors, and the message may be exposed to the client.
   *
   *    this.throw(403)
   *    this.throw(400, 'name required')
   *    this.throw('something exploded')
   *    this.throw(new Error('invalid'))
   *    this.throw(400, new Error('invalid'))
   *    this.throw(400, new Error('invalid'), { foo: 'bar' })
   *    this.throw(new Error('invalid'), { foo: 'bar' })
   *
   * See: https://github.com/jshttp/http-errors
   *
   * Note: `status` should only be passed as the first parameter.
   *
   * @param {String|Number|Error} status error, msg or status
   * @param {String|Number|Error|Object} [error] error, msg, status or errorProps
   * @param {Object} [errorProps] error object properties
   */

  throw(status: number): void;
  throw(status: number, errorProps: object): void;
  throw(status: number, errorMessage: string): void;
  throw(status: number, errorMessage: string, errorProps: object): void;
  throw(status: number, error: Error): void;
  throw(status: number, error: Error, errorProps: object): void;
  throw(errorMessage: string): void;
  throw(errorMessage: string, errorProps: object): void;
  throw(errorMessage: string, status: number): void;
  throw(errorMessage: string, status: number, errorProps: object): void;
  throw(error: Error): void;
  throw(error: Error, errorProps: object): void;
  throw(error: Error, status: number): void;
  throw(error: Error, status: number, errorProps: object): void;
  throw(
    arg1: number | string | Error,
    arg2?: number | string | Error | object,
    errorProps?: object
  ) {
    // oxlint-disable-next-line typescript/no-explicit-any
    const args: any[] = [];
    if (typeof arg2 === 'number') {
      // throw(error, status)
      args.push(arg2);
      args.push(arg1);
    } else {
      // throw(status, error?)
      args.push(arg1);
      if (arg2) {
        args.push(arg2);
      }
    }
    if (errorProps) {
      args.push(errorProps);
    }
    throw createError(...args);
  }

  /**
   * Default error handling.
   * @private
   */
  onerror(err: CustomError) {
    // don't do anything if there is no error.
    // this allows you to pass `this.onerror`
    // to node-style callbacks.
    if (err === null || err === undefined) return;

    // When dealing with cross-globals a normal `instanceof` check doesn't work properly.
    // See https://github.com/koajs/koa/issues/1466
    // We can probably remove it once jest fixes https://github.com/facebook/jest/issues/2549.
    const isNativeError =
      err instanceof Error ||
      Object.prototype.toString.call(err) === '[object Error]';
    if (!isNativeError) {
      err = new Error(util.format('non-error thrown: %j', err));
    }

    let headerSent = false;
    if (this.response.headerSent || !this.response.writable) {
      headerSent = true;
      err.headerSent = true;
    }

    // delegate
    this.app.emit('error', err, this);

    // nothing we can do here other
    // than delegate to the app-level
    // handler and log.
    if (headerSent) {
      return;
    }

    const res = this.res;

    // first unset all headers
    for (const name of res.getHeaderNames()) {
      res.removeHeader(name);
    }

    // then set those specified
    if (err.headers) {
      this.response.set(err.headers);
    }

    // force text/plain
    this.response.type = 'text';

    let statusCode = err.status || err.statusCode;

    // ENOENT support
    if (err.code === 'ENOENT') {
      statusCode = 404;
    }

    // default to 500
    if (typeof statusCode !== 'number' || !statuses.message[statusCode]) {
      statusCode = 500;
    }

    // respond
    const statusMessage = statuses.message[statusCode] as string;
    const msg = err.expose ? err.message : statusMessage;
    err.status = statusCode;
    this.response.status = statusCode;
    this.response.length = Buffer.byteLength(msg);
    res.end(msg);
  }

  protected _cookies: Cookies | undefined;

  get cookies() {
    if (!this._cookies) {
      this._cookies = new Cookies(this.req, this.res, {
        keys: this.app.keys,
        secure: this.request.secure,
      });
    }
    return this._cookies;
  }

  set cookies(cookies: Cookies) {
    this._cookies = cookies;
  }

  get state() {
    return this.#state;
  }

  /**
   * Request delegation.
   */

  acceptsLanguages(): string[];
  acceptsLanguages(languages: string[]): string | false;
  acceptsLanguages(...languages: string[]): string | false;
  acceptsLanguages(
    languages?: string | string[],
    ...others: string[]
  ): string | string[] | false {
    return this.request.acceptsLanguages(languages as string, ...others);
  }

  acceptsEncodings(): string[];
  acceptsEncodings(encodings: string[]): string | false;
  acceptsEncodings(...encodings: string[]): string | false;
  acceptsEncodings(
    encodings?: string | string[],
    ...others: string[]
  ): string[] | string | false {
    return this.request.acceptsEncodings(encodings as string, ...others);
  }

  acceptsCharsets(): string[];
  acceptsCharsets(charsets: string[]): string | false;
  acceptsCharsets(...charsets: string[]): string | false;
  acceptsCharsets(
    charsets?: string | string[],
    ...others: string[]
  ): string[] | string | false {
    return this.request.acceptsCharsets(charsets as string, ...others);
  }

  accepts(args: string[]): string | string[] | false;
  accepts(...args: string[]): string | string[] | false;
  accepts(
    args?: string | string[],
    ...others: string[]
  ): string | string[] | false {
    return this.request.accepts(args as string, ...others);
  }

  get<T = string | string[]>(field: string): T {
    return this.request.get(field);
  }

  is(type?: string | string[], ...types: string[]): string | false | null {
    return this.request.is(type, ...types);
  }

  get querystring(): string {
    return this.request.querystring;
  }

  set querystring(str: string) {
    this.request.querystring = str;
  }

  get idempotent(): boolean {
    return this.request.idempotent;
  }

  get socket() {
    return this.request.socket;
  }

  get search(): string {
    return this.request.search;
  }

  set search(str: string) {
    this.request.search = str;
  }

  get method(): string {
    return this.request.method;
  }

  set method(method: string) {
    this.request.method = method;
  }

  get query(): ParsedUrlQuery {
    return this.request.query;
  }

  set query(obj: ParsedUrlQuery) {
    this.request.query = obj;
  }

  get path(): string {
    return this.request.path;
  }

  set path(path: string) {
    this.request.path = path;
  }

  get url(): string {
    return this.request.url;
  }

  set url(url: string) {
    this.request.url = url;
  }

  get accept(): Accepts {
    return this.request.accept;
  }

  set accept(accept: Accepts) {
    this.request.accept = accept;
  }

  get origin(): string {
    return this.request.origin;
  }

  get href(): string {
    return this.request.href;
  }

  get subdomains(): string[] {
    return this.request.subdomains;
  }

  get protocol(): string {
    return this.request.protocol;
  }

  get host(): string {
    return this.request.host;
  }

  get hostname(): string {
    return this.request.hostname;
  }

  get URL(): URL {
    return this.request.URL;
  }

  get header() {
    return this.request.header;
  }

  get headers() {
    return this.request.headers;
  }

  get secure(): boolean {
    return this.request.secure;
  }

  get stale(): boolean {
    return this.request.stale;
  }

  get fresh(): boolean {
    return this.request.fresh;
  }

  get ips(): string[] {
    return this.request.ips;
  }

  get ip(): string {
    return this.request.ip;
  }

  /**
   * Response delegation.
   */

  attachment(...args: Parameters<Response['attachment']>) {
    return this.response.attachment(...args);
  }

  redirect(...args: Parameters<Response['redirect']>) {
    return this.response.redirect(...args);
  }

  remove(...args: Parameters<Response['remove']>) {
    return this.response.remove(...args);
  }

  vary(...args: Parameters<Response['vary']>) {
    return this.response.vary(...args);
  }

  has(...args: Parameters<Response['has']>) {
    return this.response.has(...args);
  }

  set(...args: Parameters<Response['set']>) {
    return this.response.set(...args);
  }

  append(...args: Parameters<Response['append']>) {
    return this.response.append(...args);
  }

  flushHeaders(...args: Parameters<Response['flushHeaders']>) {
    return this.response.flushHeaders(...args);
  }

  get status() {
    return this.response.status;
  }

  set status(status: number) {
    this.response.status = status;
  }

  get message() {
    return this.response.message;
  }

  set message(msg: string) {
    this.response.message = msg;
  }

  // oxlint-disable-next-line typescript/no-explicit-any
  get body(): any {
    return this.response.body;
  }

  // oxlint-disable-next-line typescript/no-explicit-any
  set body(val: any) {
    this.response.body = val;
  }

  get length(): number | undefined {
    return this.response.length;
  }

  set length(n: number | string | undefined) {
    this.response.length = n;
  }

  get type(): string {
    return this.response.type;
  }

  set type(type: string | null | undefined) {
    this.response.type = type;
  }

  get lastModified() {
    return this.response.lastModified;
  }

  set lastModified(val: string | Date | undefined) {
    this.response.lastModified = val;
  }

  get etag() {
    return this.response.etag;
  }

  set etag(val: string) {
    this.response.etag = val;
  }

  get headerSent() {
    return this.response.headerSent;
  }

  get writable() {
    return this.response.writable;
  }
}
