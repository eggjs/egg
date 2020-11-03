'use strict';

const querystring = require('querystring');
const accepts = require('accepts');

const _querycache = Symbol('_querycache');
const _queriesCache = Symbol('_queriesCache');
const PROTOCOL = Symbol('PROTOCOL');
const HOST = Symbol('HOST');
const ACCEPTS = Symbol('ACCEPTS');
const IPS = Symbol('IPS');
const RE_ARRAY_KEY = /[^\[\]]+\[\]$/;

module.exports = {
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
  get host() {
    if (this[HOST]) return this[HOST];

    let host;
    if (this.app.config.proxy) {
      host = getFromHeaders(this, this.app.config.hostHeaders);
    }
    host = host || this.get('host') || '';
    this[HOST] = host.split(/\s*,\s*/)[0];
    return this[HOST];
  },

  /**
   * @member {String} Request#protocol
   * @example
   * ```js
   * this.request.protocol
   * => 'https'
   * ```
   */
  get protocol() {
    if (this[PROTOCOL]) return this[PROTOCOL];
    // detect encrypted socket
    if (this.socket && this.socket.encrypted) {
      this[PROTOCOL] = 'https';
      return this[PROTOCOL];
    }
    // get from headers specified in `app.config.protocolHeaders`
    if (this.app.config.proxy) {
      const proto = getFromHeaders(this, this.app.config.protocolHeaders);
      if (proto) {
        this[PROTOCOL] = proto.split(/\s*,\s*/)[0];
        return this[PROTOCOL];
      }
    }
    // use protocol specified in `app.conig.protocol`
    this[PROTOCOL] = this.app.config.protocol || 'http';
    return this[PROTOCOL];
  },

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
  get ips() {
    if (this[IPS]) return this[IPS];

    // return empty array when proxy=false
    if (!this.app.config.proxy) {
      this[IPS] = [];
      return this[IPS];
    }

    const val = getFromHeaders(this, this.app.config.ipHeaders) || '';
    this[IPS] = val ? val.split(/\s*,\s*/) : [];

    let maxIpsCount = this.app.config.maxIpsCount;
    // Compatible with maxProxyCount logic (previous logic is wrong, only for compatibility with legacy logic)
    if (!maxIpsCount && this.app.config.maxProxyCount) maxIpsCount = this.app.config.maxProxyCount + 1;

    if (maxIpsCount > 0) {
      // if maxIpsCount present, only keep `maxIpsCount` ips
      // [ illegalIp, clientRealIp, proxyIp1, proxyIp2 ...]
      this[IPS] = this[IPS].slice(-maxIpsCount);
    }
    return this[IPS];
  },

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
  get ip() {
    if (this._ip) {
      return this._ip;
    }
    const ip = this.ips[0] || this.socket.remoteAddress;
    // will be '::ffff:x.x.x.x', should convert to standard IPv4 format
    // https://zh.wikipedia.org/wiki/IPv6
    this._ip = ip && ip.indexOf('::ffff:') > -1 ? ip.substring(7) : ip;
    return this._ip;
  },

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
  set ip(ip) {
    this._ip = ip;
  },

  /**
   * detect if response should be json
   * 1. url path ends with `.json`
   * 2. response type is set to json
   * 3. detect by request accept header
   *
   * @member {Boolean} Request#acceptJSON
   * @since 1.0.0
   */
  get acceptJSON() {
    if (this.path.endsWith('.json')) return true;
    if (this.response.type && this.response.type.indexOf('json') >= 0) return true;
    if (this.accepts('html', 'text', 'json') === 'json') return true;
    return false;
  },

  // How to read query safely
  // https://github.com/koajs/qs/issues/5
  _customQuery(cacheName, filter) {
    const str = this.querystring || '';
    let c = this[cacheName];
    if (!c) {
      c = this[cacheName] = {};
    }
    let cacheQuery = c[str];
    if (!cacheQuery) {
      cacheQuery = c[str] = {};
      const isQueries = cacheName === _queriesCache;
      // `querystring.parse` CANNOT parse something like `a[foo]=1&a[bar]=2`
      const query = str ? querystring.parse(str) : {};
      for (const key in query) {
        if (!key) {
          // key is '', like `a=b&`
          continue;
        }
        const value = filter(query[key]);
        cacheQuery[key] = value;
        if (isQueries && RE_ARRAY_KEY.test(key)) {
          // `this.queries['key'] => this.queries['key[]']` is compatibly supported
          const subkey = key.substring(0, key.length - 2);

          if (!cacheQuery[subkey]) {
            cacheQuery[subkey] = value;
          }
        }
      }
    }
    return cacheQuery;
  },

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
    return this._customQuery(_querycache, firstValue);
  },

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
    return this._customQuery(_queriesCache, arrayValue);
  },

  get accept() {
    let accept = this[ACCEPTS];
    if (accept) {
      return accept;
    }
    accept = this[ACCEPTS] = accepts(this.req);
    return accept;
  },

  /**
   * Set query-string as an object.
   *
   * @function Request#query
   * @param {Object} obj set querystring and query object for request.
   * @return {void}
   */
  set query(obj) {
    this.querystring = querystring.stringify(obj);
  },
};


function firstValue(value) {
  if (Array.isArray(value)) {
    value = value[0];
  }
  return value;
}

function arrayValue(value) {
  if (!Array.isArray(value)) {
    value = [ value ];
  }
  return value;
}

function getFromHeaders(ctx, names) {
  if (!names) return '';
  names = names.split(/\s*,\s*/);
  for (const name of names) {
    const value = ctx.get(name);
    if (value) return value;
  }
  return '';
}
