'use strict';

const querystring = require('querystring');
const accepts = require('accepts');

const _querycache = Symbol('_querycache');
const _queriesCache = Symbol('_queriesCache');
const PROTOCOL = Symbol('PROTOCOL');
const ACCEPTS = Symbol('ACCEPTS');
const IPS = Symbol('IPS');
const RE_ARRAY_KEY = /[^\[\]]+\[\]$/;
const AJAX_EXT_RE = /\.(json|tile|ajax)$/i;

module.exports = {
  /**
   * Parse the "Host" header field host
   * and support X-Forwarded-Host when a
   * proxy is enabled.
   * @member {String} Request#host
   * @example
   * ```js
   * this.request.host
   * => '127.0.0.1:7001'
   * ```
   * 如果是域名访问，会得到域名
   * ```js
   * this.request.host
   * => 'demo.eggjs.org'
   * ```
   */
  get host() {
    const host = this.get('x-forwarded-host') || this.get('host');
    if (!host) {
      return 'localhost';
    }
    return host.split(/\s*,\s*/)[0];
  },

  /**
   * 由于部署在 Nginx 后面，Koa 原始的实现无法取到正确的 protocol
   * @member {String} Request#protocol
   * @example
   * ```js
   * this.request.protocol
   * => 'https'
   * ```
   */
  get protocol() {
    if (this[PROTOCOL]) {
      return this[PROTOCOL];
    }

    if (this.socket && this.socket.encrypted) {
      this[PROTOCOL] = 'https';
      return 'https';
    }

    if (typeof this.app.config.protocolHeaders === 'string' && this.app.config.protocolHeaders) {
      const protocolHeaders = this.app.config.protocolHeaders.split(/\s*,\s*/);
      for (const header of protocolHeaders) {
        let proto = this.get(header);
        if (proto) {
          proto = this[PROTOCOL] = proto.split(/\s*,\s*/)[0];
          return proto;
        }
      }
    }

    const proto = this[PROTOCOL] = this.app.config.protocol || 'http';
    return proto;
  },

  /**
   * Request remote IPv4 address
   * @member {String} Request#ip
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
    // will be '::ffff:x.x.x.x', should conver to standard IPv4 format
    // https://zh.wikipedia.org/wiki/IPv6
    this._ip = ip && ip.indexOf('::ffff:') > -1 ? ip.substring(7) : ip;
    return this._ip;
  },

  /**
   * Set the remote address
   * @param {String} ip - IPv4 address
   */
  set ip(ip) {
    this._ip = ip;
  },

  /**
   * 从请求头获取所有 ip
   * 1. 先从 `X-Forwarded-For` 获取
   * 2. 再从 `X-Real-IP` 获取
   *
   * @member {String} Request#ips
   */
  get ips() {
    let ips = this[IPS];
    if (ips) {
      return ips;
    }

    // TODO: should trust these headers after trust proxy config set
    const val = this.get('x-forwarded-for') || this.get('x-real-ip');
    ips = this[IPS] = val
      ? val.split(/ *, */)
      : [];

    return ips;
  },

  /**
   * 判断当前请求是否 AJAX 请求, 具体判断规则:
   * - HTTP 包含 `X-Requested-With: XMLHttpRequest` header
   * - `ctx.path` 以 `.json`, `.ajax`, `.tile` 为扩展名
   * @member {Boolean} Request#isAjax
   * @since 1.0.0
   */
  get isAjax() {
    return this.get('x-requested-with') === 'XMLHttpRequest' || AJAX_EXT_RE.test(this.path);
  },

  /**
   * 判断当前请求是否接受 JSON 响应
   * 1. 如果是 ajax 请求，认为应该接受 JSON 响应
   * 2. 如果设置过响应类型，通过响应类型来判断
   * 3. 最后通过 accept 来判断
   *
   * @member {Boolean} Request#acceptJSON
   * @since 2.0.0
   */
  get acceptJSON() {
    if (this.isAjax) {
      return true;
    }
    if (this.response.type && this.response.type.indexOf('json') >= 0) {
      return true;
    }
    return this.accepts('html', 'text', 'json') === 'json';
  },

  // 关于如何安全地读取 query 参数的讨论
  // https://github.com/koajs/qs/issues/5
  _customQuery(cacheName, filter) {
    const str = this.querystring;
    if (!str) {
      return {};
    }

    let c = this[cacheName];
    if (!c) {
      c = this[cacheName] = {};
    }
    let cacheQuery = c[str];
    if (!cacheQuery) {
      cacheQuery = c[str] = {};
      const isQueries = cacheName === _queriesCache;
      // querystring.parse 不会解析 a[foo]=1&a[bar]=2 的情况
      const query = querystring.parse(str);
      for (const key in query) {
        if (!key) {
          // key is '', like `a=b&`
          continue;
        }
        const value = filter(query[key]);
        cacheQuery[key] = value;
        if (isQueries && RE_ARRAY_KEY.test(key)) {
          // 支持兼容 this.queries['key'] => this.queries['key[]']
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
   * 获取当前请求以 querystring 传递的参数，所有参数值都以 String 类型返回
   * @member {Object} Request#query
   * @example
   * ```js
   * GET http://127.0.0.1:7001?name=Foo&age=20&age=21
   * this.query
   * => { 'name': 'Foo', 'age': 20 }
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
   * 获取当前请求以 querystring 传递的参数，所有参数值都以 Array 类型返回，类似 {@link Request#query}
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
   * @method Request#query
   * @param {Object} obj set querystring and query object for request.
   * @return {void}
   * @api public
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
