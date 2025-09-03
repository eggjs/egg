import net, { type Socket } from 'node:net';
import { format as stringify } from 'node:url';
import qs, { type ParsedUrlQuery } from 'node:querystring';
import util from 'node:util';
import type { IncomingMessage, ServerResponse } from 'node:http';

import accepts, { type Accepts } from 'accepts';
import contentType from 'content-type';
import parse from 'parseurl';
import typeis from 'type-is';
import fresh from 'fresh';

import type { Application } from './application.ts';
import type { Context } from './context.ts';
import type { Response } from './response.ts';

export interface RequestSocket extends Socket {
  encrypted: boolean;
}

export class Request {
  [key: symbol]: unknown;
  app: Application;
  req: IncomingMessage;
  res: ServerResponse;
  ctx: Context;
  response: Response;
  originalUrl: string;

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
    this.originalUrl = req.url ?? '/';
  }

  /**
   * Return request header.
   */

  get header() {
    return this.req.headers;
  }

  /**
   * Set request header.
   */

  set header(val) {
    this.req.headers = val;
  }

  /**
   * Return request header, alias as request.header
   */

  get headers() {
    return this.req.headers;
  }

  /**
   * Set request header, alias as request.header
   */

  set headers(val) {
    this.req.headers = val;
  }

  /**
   * Get request URL.
   */

  get url() {
    return this.req.url ?? '/';
  }

  /**
   * Set request URL.
   */

  set url(val) {
    this.req.url = val;
  }

  /**
   * Get origin of URL.
   */

  get origin() {
    return `${this.protocol}://${this.host}`;
  }

  /**
   * Get full request URL.
   */

  get href() {
    // support: `GET http://example.com/foo`
    if (/^https?:\/\//i.test(this.originalUrl)) {
      return this.originalUrl;
    }
    return this.origin + this.originalUrl;
  }

  /**
   * Get request method.
   */

  get method() {
    return this.req.method ?? 'GET';
  }

  /**
   * Set request method.
   */
  set method(val: string) {
    this.req.method = val;
  }

  /**
   * Get request pathname.
   */
  get path() {
    return parse(this.req)?.pathname ?? '';
  }

  /**
   * Set pathname, retaining the query string when present.
   */
  set path(pathname: string) {
    const url = parse(this.req);
    if (!url) return;
    if (url.pathname === pathname) return;

    url.pathname = pathname;
    url.path = null;

    this.url = stringify(url);
  }

  protected _parsedUrlQueryCache: Record<string, ParsedUrlQuery> | undefined;

  /**
   * Get parsed query string.
   */
  get query(): ParsedUrlQuery {
    const str = this.querystring;
    if (!this._parsedUrlQueryCache) {
      this._parsedUrlQueryCache = {};
    }
    let parsedUrlQuery = this._parsedUrlQueryCache[str];
    if (!parsedUrlQuery) {
      parsedUrlQuery = qs.parse(str);
      this._parsedUrlQueryCache[str] = parsedUrlQuery;
    }
    return parsedUrlQuery;
  }

  /**
   * Set query string as an object.
   */
  set query(obj: ParsedUrlQuery) {
    this.querystring = qs.stringify(obj);
  }

  /**
   * Get query string.
   */
  get querystring() {
    if (!this.req) return '';
    return (parse(this.req)?.query as string) ?? '';
  }

  /**
   * Set query string.
   */
  set querystring(str: string) {
    const url = parse(this.req);
    if (!url) return;
    if (url.search === `?${str}`) return;

    url.search = str;
    url.path = null;
    this.url = stringify(url);
  }

  /**
   * Get the search string. Same as the query string
   * except it includes the leading ?.
   */
  get search() {
    const querystring = this.querystring;
    if (!querystring) return '';
    return `?${querystring}`;
  }

  /**
   * Set the search string. Same as
   * request.querystring= but included for ubiquity.
   */
  set search(str: string) {
    this.querystring = str;
  }

  /**
   * Parse the "Host" header field host
   * and support X-Forwarded-Host when a
   * proxy is enabled.
   * return `hostname:port` format
   */
  get host() {
    const proxy = this.app.proxy;
    let host = proxy ? this.get<string>('X-Forwarded-Host') : '';
    if (host) {
      host = splitCommaSeparatedValues(host, 1)[0];
    }
    if (!host) {
      if (this.req.httpVersionMajor >= 2) {
        host = this.get(':authority');
      }
      if (!host) {
        host = this.get('Host');
      }
    }
    return host;
  }

  /**
   * Parse the "Host" header field hostname
   * and support X-Forwarded-Host when a
   * proxy is enabled.
   */
  get hostname() {
    const host = this.host;
    if (!host) {
      return '';
    }
    if (host[0] === '[') {
      return this.URL.hostname || ''; // IPv6
    }
    return host.split(':', 1)[0];
  }

  protected _memoizedURL: URL | undefined;

  /**
   * Get WHATWG parsed URL.
   * Lazily memoized.
   */
  get URL() {
    if (!this._memoizedURL) {
      const originalUrl = this.originalUrl || ''; // avoid undefined in template string
      try {
        this._memoizedURL = new URL(`${this.origin}${originalUrl}`);
      } catch {
        this._memoizedURL = Object.create(null);
      }
    }
    return this._memoizedURL as URL;
  }

  /**
   * Check if the request is fresh, aka
   * Last-Modified and/or the ETag
   * still match.
   */
  get fresh() {
    const method = this.method;
    const status = this.response.status;

    // GET or HEAD for weak freshness validation only
    if (method !== 'GET' && method !== 'HEAD') {
      return false;
    }

    // 2xx or 304 as per rfc2616 14.26
    if ((status >= 200 && status < 300) || status === 304) {
      return fresh(this.header, this.response.header);
    }

    return false;
  }

  /**
   * Check if the request is stale, aka
   * "Last-Modified" and / or the "ETag" for the
   * resource has changed.
   */
  get stale() {
    return !this.fresh;
  }

  /**
   * Check if the request is idempotent.
   */
  get idempotent() {
    const methods = ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS', 'TRACE'];
    return methods.includes(this.method);
  }

  /**
   * Return the request socket.
   */
  get socket() {
    return this.req.socket as RequestSocket;
  }

  /**
   * Get the charset when present or undefined.
   */
  get charset() {
    try {
      const { parameters } = contentType.parse(this.req);
      return parameters.charset || '';
    } catch {
      return '';
    }
  }

  /**
   * Return parsed Content-Length when present.
   */
  get length() {
    const len = this.get<string>('Content-Length');
    if (len === '') {
      return;
    }
    return Number.parseInt(len);
  }

  /**
   * Return the protocol string "http" or "https"
   * when requested with TLS. When the proxy setting
   * is enabled the "X-Forwarded-Proto" header
   * field will be trusted. If you're running behind
   * a reverse proxy that supplies https for you this
   * may be enabled.
   */
  get protocol() {
    if (this.socket.encrypted) {
      return 'https';
    }
    if (!this.app.proxy) {
      return 'http';
    }
    let proto = this.get<string>('X-Forwarded-Proto');
    if (proto) {
      proto = splitCommaSeparatedValues(proto, 1)[0];
    }
    return proto || 'http';
  }

  /**
   * Shorthand for:
   *
   *    this.protocol == 'https'
   */
  get secure() {
    return this.protocol === 'https';
  }

  /**
   * When `app.proxy` is `true`, parse
   * the "X-Forwarded-For" ip address list.
   *
   * For example if the value was "client, proxy1, proxy2"
   * you would receive the array `["client", "proxy1", "proxy2"]`
   * where "proxy2" is the furthest down-stream.
   */
  get ips() {
    const proxy = this.app.proxy;
    const val = this.get<string>(this.app.proxyIpHeader);
    let ips = proxy && val ? splitCommaSeparatedValues(val) : [];
    if (this.app.maxIpsCount > 0) {
      ips = ips.slice(-this.app.maxIpsCount);
    }
    return ips;
  }

  protected _ip: string;
  /**
   * Return request's remote address
   * When `app.proxy` is `true`, parse
   * the "X-Forwarded-For" ip address list and return the first one
   */
  get ip() {
    if (!this._ip) {
      this._ip = this.ips[0] || this.socket.remoteAddress || '';
    }
    return this._ip;
  }

  set ip(ip: string) {
    this._ip = ip;
  }

  /**
   * Return subdomains as an array.
   *
   * Subdomains are the dot-separated parts of the host before the main domain
   * of the app. By default, the domain of the app is assumed to be the last two
   * parts of the host. This can be changed by setting `app.subdomainOffset`.
   *
   * For example, if the domain is "tobi.ferrets.example.com":
   * If `app.subdomainOffset` is not set, this.subdomains is
   * `["ferrets", "tobi"]`.
   * If `app.subdomainOffset` is 3, this.subdomains is `["tobi"]`.
   */
  get subdomains() {
    const offset = this.app.subdomainOffset;
    const hostname = this.hostname;
    if (net.isIP(hostname)) return [];
    return hostname.split('.').reverse().slice(offset);
  }

  protected _accept: Accepts;
  /**
   * Get accept object.
   * Lazily memoized.
   */
  get accept() {
    return this._accept || (this._accept = accepts(this.req));
  }

  /**
   * Set accept object.
   */
  set accept(obj: Accepts) {
    this._accept = obj;
  }

  /**
   * Check if the given `type(s)` is acceptable, returning
   * the best match when true, otherwise `false`, in which
   * case you should respond with 406 "Not Acceptable".
   *
   * The `type` value may be a single mime type string
   * such as "application/json", the extension name
   * such as "json" or an array `["json", "html", "text/plain"]`. When a list
   * or array is given the _best_ match, if any is returned.
   *
   * Examples:
   *
   *     // Accept: text/html
   *     this.accepts('html');
   *     // => "html"
   *
   *     // Accept: text/*, application/json
   *     this.accepts('html');
   *     // => "html"
   *     this.accepts('text/html');
   *     // => "text/html"
   *     this.accepts('json', 'text');
   *     // => "json"
   *     this.accepts('application/json');
   *     // => "application/json"
   *
   *     // Accept: text/*, application/json
   *     this.accepts('image/png');
   *     this.accepts('png');
   *     // => false
   *
   *     // Accept: text/*;q=.5, application/json
   *     this.accepts(['html', 'json']);
   *     this.accepts('html', 'json');
   *     // => "json"
   */
  accepts(args: string[]): string | string[] | false;
  accepts(...args: string[]): string | string[] | false;
  accepts(
    args?: string | string[],
    ...others: string[]
  ): string | string[] | false {
    return this.accept.types(args as string, ...others);
  }

  /**
   * Return accepted encodings or best fit based on `encodings`.
   *
   * Given `Accept-Encoding: gzip, deflate`
   * an array sorted by quality is returned:
   *
   *     ['gzip', 'deflate']
   */
  acceptsEncodings(): string[];
  acceptsEncodings(encodings: string[]): string | false;
  acceptsEncodings(...encodings: string[]): string | false;
  acceptsEncodings(
    encodings?: string | string[],
    ...others: string[]
  ): string[] | string | false {
    if (!encodings) {
      return this.accept.encodings();
    }
    if (Array.isArray(encodings)) {
      encodings = [...encodings, ...others];
    } else {
      encodings = [encodings, ...others];
    }
    return this.accept.encodings(...encodings);
  }

  /**
   * Return accepted charsets or best fit based on `charsets`.
   *
   * Given `Accept-Charset: utf-8, iso-8859-1;q=0.2, utf-7;q=0.5`
   * an array sorted by quality is returned:
   *
   *     ['utf-8', 'utf-7', 'iso-8859-1']
   */
  acceptsCharsets(): string[];
  acceptsCharsets(charsets: string[]): string | false;
  acceptsCharsets(...charsets: string[]): string | false;
  acceptsCharsets(
    charsets?: string | string[],
    ...others: string[]
  ): string[] | string | false {
    if (!charsets) {
      return this.accept.charsets();
    }
    if (Array.isArray(charsets)) {
      charsets = [...charsets, ...others];
    } else {
      charsets = [charsets, ...others];
    }
    return this.accept.charsets(...charsets);
  }

  /**
   * Return accepted languages or best fit based on `langs`.
   *
   * Given `Accept-Language: en;q=0.8, es, pt`
   * an array sorted by quality is returned:
   *
   *     ['es', 'pt', 'en']
   */
  acceptsLanguages(): string[];
  acceptsLanguages(languages: string[]): string | false;
  acceptsLanguages(...languages: string[]): string | false;
  acceptsLanguages(
    languages?: string | string[],
    ...others: string[]
  ): string | string[] | false {
    if (!languages) {
      return this.accept.languages();
    }
    if (Array.isArray(languages)) {
      languages = [...languages, ...others];
    } else {
      languages = [languages, ...others];
    }
    return this.accept.languages(...languages);
  }

  /**
   * Check if the incoming request contains the "Content-Type"
   * header field and if it contains any of the given mime `type`s.
   * If there is no request body, `null` is returned.
   * If there is no content type, `false` is returned.
   * Otherwise, it returns the first `type` that matches.
   *
   * Examples:
   *
   *     // With Content-Type: text/html; charset=utf-8
   *     this.is('html'); // => 'html'
   *     this.is('text/html'); // => 'text/html'
   *     this.is('text/*', 'application/json'); // => 'text/html'
   *
   *     // When Content-Type is application/json
   *     this.is('json', 'urlencoded'); // => 'json'
   *     this.is('application/json'); // => 'application/json'
   *     this.is('html', 'application/*'); // => 'application/json'
   *
   *     this.is('html'); // => false
   */
  is(type?: string | string[], ...types: string[]): string | false | null {
    let testTypes: string[] = [];
    if (type) {
      testTypes = Array.isArray(type) ? type : [type];
    }
    return typeis(this.req, [...testTypes, ...types]);
  }

  /**
   * Return the request mime type void of
   * parameters such as "charset".
   */
  get type() {
    const type = this.get<string>('Content-Type');
    if (!type) return '';
    return type.split(';')[0];
  }

  /**
   * Return request header.
   *
   * The `Referrer` header field is special-cased,
   * both `Referrer` and `Referer` are interchangeable.
   *
   * Examples:
   *
   *     this.get('Content-Type');
   *     // => "text/plain"
   *
   *     this.get('content-type');
   *     // => "text/plain"
   *
   *     this.get('Something');
   *     // => ''
   */
  get<T = string | string[]>(field: string): T {
    const req = this.req;
    switch ((field = field.toLowerCase())) {
      case 'referer':
      case 'referrer': {
        return (req.headers.referrer || req.headers.referer || '') as T;
      }
      default: {
        return (req.headers[field] || '') as T;
      }
    }
  }

  /**
   * Inspect implementation.
   */
  inspect() {
    if (!this.req) return;
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
   */
  toJSON() {
    return {
      method: this.method,
      url: this.url,
      header: this.header,
    };
  }
}

/**
 * Split a comma-separated value string into an array of values, with an optional limit.
 * All the values are trimmed of whitespace and filtered out empty values.
 *
 * @param {string} value - The comma-separated value string to split.
 * @param {number} [limit] - The maximum number of values to return.
 * @returns {string[]} An array of values from the comma-separated string.
 */
function splitCommaSeparatedValues(value: string, limit?: number): string[] {
  return value
    .split(',', limit)
    .map(v => v.trim())
    .filter(v => v.length > 0);
}
