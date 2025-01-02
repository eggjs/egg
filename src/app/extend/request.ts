import querystring from 'node:querystring';
import { Request as EggCoreRequest } from '@eggjs/core';
import type { Application } from '../../lib/application.js';
import type Context from './context.js';
import Response from './response.js';

const QUERY_CACHE = Symbol('request query cache');
const QUERIES_CACHE = Symbol('request queries cache');
const PROTOCOL = Symbol('request protocol');
const HOST = Symbol('request host');
const IPS = Symbol('request ips');
const RE_ARRAY_KEY = /[^\[\]]+\[\]$/;

export default class Request extends EggCoreRequest {
  declare app: Application;
  declare ctx: Context;
  declare response: Response;

  /**
   * Request body, parsed from koa-bodyparser or egg-multipart
   */
  declare body: any;

  /**
   * Parse the "Host" header field host
   * and support X-Forwarded-Host when a
   * proxy is enabled.
   * @member {String} Request#host
   * @example
   * ip + port
   * ```js
   * this.request.host
   * => '127.0.0.1:7001'
   * ```
   * or domain
   * ```js
   * this.request.host
   * => 'demo.eggjs.org'
   * ```
   */
  get host(): string {
    let host = this[HOST] as string | undefined;
    if (host) {
      return host;
    }

    if (this.app.config.proxy) {
      host = getFromHeaders(this, this.app.config.hostHeaders);
    }
    host = host || this.get('host') || '';
    this[HOST] = host = host.split(',')[0].trim();
    return host;
  }

  /**
   * @member {String} Request#protocol
   * @example
   * ```js
   * this.request.protocol
   * => 'https'
   * ```
   */
  get protocol(): string {
    let protocol = this[PROTOCOL] as string;
    if (protocol) {
      return protocol;
    }
    // detect encrypted socket
    if (this.socket?.encrypted) {
      this[PROTOCOL] = protocol = 'https';
      return protocol;
    }
    // get from headers specified in `app.config.protocolHeaders`
    if (this.app.config.proxy) {
      const proto = getFromHeaders(this, this.app.config.protocolHeaders);
      if (proto) {
        this[PROTOCOL] = protocol = proto.split(/\s*,\s*/)[0];
        return protocol;
      }
    }
    // use protocol specified in `app.config.protocol`
    this[PROTOCOL] = protocol = this.app.config.protocol || 'http';
    return protocol;
  }

  /**
   * Get all pass through ip addresses from the request.
   * Enable only on `app.config.proxy = true`
   *
   * @member {Array} Request#ips
   * @example
   * ```js
   * this.request.ips
   * => ['100.23.1.2', '201.10.10.2']
   * ```
   */
  get ips(): string[] {
    let ips = this[IPS] as string[] | undefined;
    if (ips) {
      return ips;
    }

    // return empty array when proxy=false
    if (!this.app.config.proxy) {
      this[IPS] = ips = [];
      return ips;
    }

    const val = getFromHeaders(this, this.app.config.ipHeaders);
    this[IPS] = ips = val ? val.split(/\s*,\s*/) : [];

    let maxIpsCount = this.app.config.maxIpsCount;
    // Compatible with maxProxyCount logic (previous logic is wrong, only for compatibility with legacy logic)
    if (!maxIpsCount && this.app.config.maxProxyCount) {
      maxIpsCount = this.app.config.maxProxyCount + 1;
    }

    if (maxIpsCount > 0) {
      // if maxIpsCount present, only keep `maxIpsCount` ips
      // [ illegalIp, clientRealIp, proxyIp1, proxyIp2 ...]
      this[IPS] = ips = ips.slice(-maxIpsCount);
    }
    return ips;
  }

  /**
   * Get the request remote IPv4 address
   * @member {String} Request#ip
   * @return {String} IPv4 address
   * @example
   * ```js
   * this.request.ip
   * => '127.0.0.1'
   * => '111.10.2.1'
   * ```
   */
  get ip(): string {
    if (this._ip) {
      return this._ip;
    }
    const ip = this.ips[0] ?? this.socket.remoteAddress;
    // will be '::ffff:x.x.x.x', should convert to standard IPv4 format
    // https://zh.wikipedia.org/wiki/IPv6
    this._ip = ip && ip.startsWith('::ffff:') ? ip.substring(7) : ip;
    return this._ip;
  }

  /**
   * Set the request remote IPv4 address
   * @member {String} Request#ip
   * @param {String} ip - IPv4 address
   * @example
   * ```js
   * this.request.ip
   * => '127.0.0.1'
   * => '111.10.2.1'
   * ```
   */
  set ip(ip: string) {
    this._ip = ip;
  }

  /**
   * detect if response should be json
   * 1. url path ends with `.json`
   * 2. response type is set to json
   * 3. detect by request accept header
   *
   * @member {Boolean} Request#acceptJSON
   * @since 1.0.0
   */
  get acceptJSON(): boolean {
    if (this.path.endsWith('.json')) return true;
    if (this.response.type && this.response.type.indexOf('json') >= 0) return true;
    if (this.accepts('html', 'text', 'json') === 'json') return true;
    return false;
  }

  // How to read query safely
  // https://github.com/koajs/qs/issues/5
  _customQuery(cacheName: symbol, filter: (value: string | string[]) => string | string[]) {
    const str = this.querystring || '';
    let c = this[cacheName] as Record<string, Record<string, string | string[]>>;
    if (!c) {
      c = this[cacheName] = {};
    }
    let cacheQuery = c[str];
    if (!cacheQuery) {
      cacheQuery = c[str] = {};
      const isQueries = cacheName === QUERIES_CACHE;
      // `querystring.parse` CANNOT parse something like `a[foo]=1&a[bar]=2`
      const query = str ? querystring.parse(str) : {};
      for (const key in query) {
        if (!key) {
          // key is '', like `a=b&`
          continue;
        }
        const value = filter(query[key]!);
        cacheQuery[key] = value;
        if (isQueries && RE_ARRAY_KEY.test(key)) {
          // `this.queries['key'] => this.queries['key[]']` is compatibly supported
          const subKey = key.substring(0, key.length - 2);
          if (!cacheQuery[subKey]) {
            cacheQuery[subKey] = value;
          }
        }
      }
    }
    return cacheQuery;
  }

  /**
   * get params pass by querystring, all values are of string type.
   * @member {Object} Request#query
   * @example
   * ```js
   * GET http://127.0.0.1:7001?name=Foo&age=20&age=21
   * this.query
   * => { 'name': 'Foo', 'age': '20' }
   *
   * GET http://127.0.0.1:7001?a=b&a=c&o[foo]=bar&b[]=1&b[]=2&e=val
   * this.query
   * =>
   * {
   *   "a": "b",
   *   "o[foo]": "bar",
   *   "b[]": "1",
   *   "e": "val"
   * }
   * ```
   */
  get query() {
    return this._customQuery(QUERY_CACHE, firstValue) as Record<string, string>;
  }

  /**
   * get params pass by querystring, all value are Array type. {@link Request#query}
   * @member {Array} Request#queries
   * @example
   * ```js
   * GET http://127.0.0.1:7001?a=b&a=c&o[foo]=bar&b[]=1&b[]=2&e=val
   * this.queries
   * =>
   * {
   *   "a": ["b", "c"],
   *   "o[foo]": ["bar"],
   *   "b[]": ["1", "2"],
   *   "e": ["val"]
   * }
   * ```
   */
  get queries() {
    return this._customQuery(QUERIES_CACHE, arrayValue) as Record<string, string[]>;
  }

  /**
   * Set query-string as an object.
   *
   * @function Request#query
   * @param {Object} obj set querystring and query object for request.
   */
  set query(obj: Record<string, string>) {
    this.querystring = querystring.stringify(obj);
  }
}

function firstValue(value: string | string[]) {
  if (Array.isArray(value)) {
    value = value[0];
  }
  return value;
}

function arrayValue(value: string | string[]) {
  if (!Array.isArray(value)) {
    value = [ value ];
  }
  return value;
}

function getFromHeaders(request: Request, names: string) {
  if (!names) return '';
  const fields = names.split(/\s*,\s*/);
  for (const name of fields) {
    const value = request.get<string>(name);
    if (value) return value;
  }
  return '';
}
