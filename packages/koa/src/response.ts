import assert from 'node:assert';
import { extname } from 'node:path';
import util from 'node:util';
import Stream from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';

import contentDisposition, {
  type Options as ContentDispositionOptions,
} from 'content-disposition';
import { getType } from 'cache-content-type';
import onFinish from 'on-finished';
import escape from 'escape-html';
import { is as typeis } from 'type-is';
import statuses from 'statuses';
import destroy from 'destroy';
import vary from 'vary';
import encodeUrl from 'encodeurl';

import type { Application } from './application.ts';
import type { Context } from './context.ts';
import type { Request } from './request.ts';

export class Response {
  [key: symbol]: unknown;
  app: Application;
  req: IncomingMessage;
  res: ServerResponse;
  ctx: Context;
  request: Request;

  constructor(
    app: Application,
    ctx: Context,
    req: IncomingMessage,
    res: ServerResponse
  ) {
    this.app = app;
    this.req = req;
    this.res = res;
    this.ctx = ctx;
  }

  /**
   * Return the request socket.
   */
  get socket() {
    return this.res.socket;
  }

  /**
   * Return response header.
   */
  get header() {
    return this.res.getHeaders() || {};
  }

  /**
   * Return response header, alias as response.header
   */
  get headers() {
    return this.header;
  }

  _explicitStatus: boolean;

  /**
   * Get response status code.
   */
  get status() {
    return this.res.statusCode;
  }

  /**
   * Set response status code.
   */
  set status(code: number) {
    if (this.headerSent) return;
    assert.ok(Number.isInteger(code), 'status code must be a number');
    assert.ok(code >= 100 && code <= 999, `invalid status code: ${code}`);
    this._explicitStatus = true;
    this.res.statusCode = code;
    if (this.req.httpVersionMajor < 2 && statuses.message[code]) {
      this.res.statusMessage = statuses.message[code];
    }
    if (this.body && statuses.empty[code]) {
      this.body = null;
    }
  }

  /**
   * Get response status message
   */
  get message(): string {
    return this.res.statusMessage ?? statuses.message[this.status];
  }

  /**
   * Set response status message
   */
  set message(msg: string) {
    this.res.statusMessage = msg;
  }

  // oxlint-disable-next-line typescript/no-explicit-any
  _body: any;
  _explicitNullBody: boolean;

  /**
   * Get response body.
   */
  get body() {
    return this._body;
  }

  /**
   * Set response body.
   */
  set body(
    val: string | Buffer | object | Stream | null | undefined | boolean
  ) {
    const original = this._body;
    this._body = val;

    // no content
    if (val === null || val === undefined) {
      if (!statuses.empty[this.status]) {
        this.status = 204;
      }
      if (val === null) {
        this._explicitNullBody = true;
      }
      this.remove('Content-Type');
      this.remove('Content-Length');
      this.remove('Transfer-Encoding');
      return;
    }

    // set the status
    if (!this._explicitStatus) this.status = 200;

    // set the content-type only if not yet set
    const setType = !this.has('Content-Type');

    // string
    if (typeof val === 'string') {
      if (setType) this.type = /^\s*?</.test(val) ? 'html' : 'text';
      this.length = Buffer.byteLength(val);
      return;
    }

    // buffer
    if (Buffer.isBuffer(val)) {
      if (setType) this.type = 'bin';
      this.length = val.length;
      return;
    }

    // stream
    if (val instanceof Stream) {
      onFinish(this.res, destroy.bind(null, val));
      // oxlint-disable-next-line eqeqeq
      if (original != val) {
        val.once('error', err => this.ctx.onerror(err));
        // overwriting
        if (original !== null && original !== undefined) {
          this.remove('Content-Length');
        }
      }

      if (setType) {
        this.type = 'bin';
      }
      return;
    }

    // json
    this.remove('Content-Length');
    this.type = 'json';
  }

  /**
   * Set Content-Length field to `n`.
   */
  set length(n: number | string | undefined) {
    if (n === undefined) return;
    if (!this.has('Transfer-Encoding')) {
      this.set('Content-Length', n);
    }
  }

  /**
   * Return parsed response Content-Length when present.
   *
   * When Content-Length is not defined it will return `undefined`.
   */
  get length(): number | undefined {
    if (this.has('Content-Length')) {
      return Number.parseInt(this.get('Content-Length')) || 0;
    }

    const body = this.body;
    if (!body || body instanceof Stream) {
      return undefined;
    }
    if (typeof body === 'string') {
      return Buffer.byteLength(body);
    }
    if (Buffer.isBuffer(body)) {
      return body.length;
    }
    return Buffer.byteLength(JSON.stringify(body));
  }

  /**
   * Check if a header has been written to the socket.
   */
  get headerSent() {
    return this.res.headersSent;
  }

  /**
   * Vary on `field`.
   */
  vary(field: string) {
    if (this.headerSent) return;
    vary(this.res, field);
  }

  _getBackReferrer() {
    const referrer = this.ctx.get<string>('Referrer');
    if (referrer) {
      // referrer is a relative path
      if (referrer.startsWith('/')) {
        return referrer;
      }

      // referrer is an absolute URL, check if it's the same origin
      const url = new URL(referrer, this.ctx.href);
      if (url.host === this.ctx.host) {
        return referrer;
      }
    }
  }

  /**
   * Perform a 302 redirect to `url`.
   *
   * The string "back" is special-cased
   * to provide Referrer support, when Referrer
   * is not present `alt` or "/" is used.
   *
   * Examples:
   *
   *    this.redirect('back');
   *    this.redirect('back', '/index.html');
   *    this.redirect('/login');
   *    this.redirect('http://google.com'); // will format to 'http://google.com/'
   */
  redirect(url: string, alt?: string) {
    // location
    if (url === 'back') {
      url = this._getBackReferrer() || alt || '/';
    }
    if (url.startsWith('https://') || url.startsWith('http://')) {
      // formatting url again avoid security escapes
      url = new URL(url).toString();
    }
    this.set('Location', encodeUrl(url));

    // status
    if (!statuses.redirect[this.status]) this.status = 302;

    // html
    if (this.ctx.accepts('html')) {
      url = escape(url);
      this.type = 'text/html; charset=utf-8';
      this.body = `Redirecting to ${url}.`;
      return;
    }

    // text
    this.type = 'text/plain; charset=utf-8';
    this.body = `Redirecting to ${url}.`;
  }

  /**
   * Set Content-Disposition header to "attachment" with optional `filename`.
   */
  attachment(filename?: string, options?: ContentDispositionOptions) {
    if (filename) this.type = extname(filename);
    this.set('Content-Disposition', contentDisposition(filename, options));
  }

  /**
   * Set Content-Type response header with `type` through `mime.lookup()`
   * when it does not contain a charset.
   *
   * Examples:
   *
   *     this.type = '.html';
   *     this.type = 'html';
   *     this.type = 'json';
   *     this.type = 'application/json';
   *     this.type = 'png';
   */
  set type(type: string | null | undefined) {
    if (!type) {
      this.remove('Content-Type');
      return;
    }
    const mimeType = getType(type);
    if (mimeType) {
      this.set('Content-Type', mimeType);
    }
  }

  /**
   * Return the response mime type void of
   * parameters such as "charset".
   */
  get type(): string {
    const type = this.get<string>('Content-Type');
    if (!type) return '';
    return type.split(';', 1)[0];
  }

  /**
   * Check whether the response is one of the listed types.
   * Pretty much the same as `this.request.is()`.
   *
   *     this.response.is('html')
   *     this.response.is('html', 'json')
   */
  is(type?: string | string[], ...types: string[]): string | false {
    let testTypes: string[] = [];
    if (type) {
      testTypes = Array.isArray(type) ? type : [type];
    }
    return typeis(this.type, [...testTypes, ...types]);
  }

  /**
   * Set the Last-Modified date using a string or a Date.
   *
   *     this.response.lastModified = new Date();
   *     this.response.lastModified = '2013-09-13';
   */
  set lastModified(val: string | Date | undefined) {
    if (typeof val === 'string') val = new Date(val);
    if (val) {
      this.set('Last-Modified', val.toUTCString());
    }
  }

  /**
   * Get the Last-Modified date in Date form, if it exists.
   */
  get lastModified(): Date | undefined {
    const date = this.get<string>('last-modified');
    if (date) return new Date(date);
  }

  /**
   * Set the ETag of a response.
   * This will normalize the quotes if necessary.
   *
   *     this.response.etag = 'md5-hash-sum';
   *     this.response.etag = '"md5-hash-sum"';
   *     this.response.etag = 'W/"123456789"';
   */
  set etag(val: string) {
    if (!/^(W\/)?"/.test(val)) val = `"${val}"`;
    this.set('ETag', val);
  }

  /**
   * Get the ETag of a response.
   */
  get etag() {
    return this.get('ETag');
  }

  /**
   * Return response header.
   *
   * Examples:
   *
   *     this.get('Content-Type');
   *     // => "text/plain"
   *
   *     this.get('content-type');
   *     // => "text/plain"
   */
  get<T = string | string[] | number>(field: string): T {
    return (this.header[field.toLowerCase()] || '') as T;
  }

  /**
   * Returns true if the header identified by name is currently set in the outgoing headers.
   * The header name matching is case-insensitive.
   *
   * Examples:
   *
   *     this.has('Content-Type');
   *     // => true
   *
   *     this.get('content-type');
   *     // => true
   */
  has(field: string) {
    return this.res.hasHeader(field);
  }

  /**
   * Set header `field` to `val` or pass
   * an object of header fields.
   *
   * Examples:
   *
   *    this.set('Foo', ['bar', 'baz']);
   *    this.set('Accept', 'application/json');
   *    this.set({ Accept: 'text/plain', 'X-API-Key': 'tobi' });
   */
  set(
    field: string | Record<string, string>,
    val?: string | number | unknown[]
  ) {
    if (this.headerSent) return;
    if (typeof field === 'string') {
      let value = val as string | string[];
      if (Array.isArray(val)) {
        value = val.map(v => (typeof v === 'string' ? v : String(v)));
      } else if (typeof val !== 'string') {
        value = String(val);
      }
      this.res.setHeader(field, value);
    } else {
      for (const key in field) {
        this.set(key, field[key]);
      }
    }
  }

  /**
   * Append additional header `field` with value `val`.
   *
   * Examples:
   *
   * ```
   * this.append('Link', ['<http://localhost/>', '<http://localhost:3000/>']);
   * this.append('Set-Cookie', 'foo=bar; Path=/; HttpOnly');
   * this.append('Warning', '199 Miscellaneous warning');
   */
  append(field: string, val: string | string[]) {
    const prev = this.get<string | string[]>(field);

    let value = val;
    if (prev) {
      value = Array.isArray(prev) ? prev.concat(value) : [prev].concat(val);
    }

    return this.set(field, value);
  }

  /**
   * Remove header `field`.
   */
  remove(field: string) {
    if (this.headerSent) return;
    this.res.removeHeader(field);
  }

  /**
   * Checks if the request is writable.
   * Tests for the existence of the socket
   * as node sometimes does not set it.
   */
  get writable() {
    // can't write any more after response finished
    // response.writableEnded is available since Node > 12.9
    // https://nodejs.org/api/http.html#http_response_writableended
    // response.finished is undocumented feature of previous Node versions
    // https://stackoverflow.com/questions/16254385/undocumented-response-finished-in-node-js
    if (this.res.writableEnded || this.res.finished) return false;

    const socket = this.res.socket;
    // There are already pending outgoing res, but still writable
    // https://github.com/nodejs/node/blob/v4.4.7/lib/_http_server.js#L486
    if (!socket) return true;
    return socket.writable;
  }

  /**
   * Inspect implementation.
   */
  inspect() {
    if (!this.res) return;
    const o = this.toJSON();
    Reflect.set(o, 'body', this.body);
    return o;
  }

  [util.inspect.custom]() {
    return this.inspect();
  }

  /**
   * Return JSON representation.
   */
  toJSON() {
    return {
      status: this.status,
      message: this.message,
      header: this.header,
    };
  }

  /**
   * Flush any set headers and begin the body
   */
  flushHeaders() {
    this.res.flushHeaders();
  }
}
