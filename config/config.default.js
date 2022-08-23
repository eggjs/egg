'use strict';

const fs = require('fs');
const path = require('path');

/**
 * The configuration of egg application, can be access by `app.config`
 * @class Config
 * @since 1.0.0
 */

module.exports = appInfo => {

  const config = {

    /**
     * The environment of egg
     * @member {String} Config#env
     * @see {appInfo#env}
     * @since 1.0.0
     */
    env: appInfo.env,

    /**
     * The name of the application
     * @member {String} Config#name
     * @see {appInfo#name}
     * @since 1.0.0
     */
    name: appInfo.name,

    /**
     * The key that signing cookies. It can contain multiple keys seperated by `,`.
     * @member {String} Config#keys
     * @see http://eggjs.org/en/core/cookie-and-session.html#cookie-secret-key
     * @default
     * @since 1.0.0
     */
    keys: '',

    /**
     * default cookie options
     *
     * @member Config#cookies
     * @property {String} sameSite - SameSite property, defaults is ''
     * @property {Boolean} httpOnly - httpOnly property, defaults is true
     */
    cookies: {
      // httpOnly: true | false,
      // sameSite: 'none|lax|strict',
    },

    /**
     * Whether application deployed after a reverse proxy,
     * when true proxy header fields will be trusted
     * @member {Boolean} Config#proxy
     * @default
     * @since 1.0.0
     */
    proxy: false,

    /**
     *
     * max ips read from proxy ip header, default to 0 (means infinity)
     * to prevent users from forging client ip addresses via x-forwarded-for
     * @see https://github.com/koajs/koa/blob/master/docs/api/request.md#requestips
     * @member {Integer} Config#maxIpsCount
     * @default
     * @since 2.25.0
     */
    maxIpsCount: 0,

    /**
     * please use maxIpsCount instead
     * @member {Integer} Config#maxProxyCount
     * @default
     * @since 2.21.0
     * @deprecated
     */
    maxProxyCount: 0,

    /**
     * Detect request's protocol from specified headers, not case-sensitive.
     * Only worked when config.proxy set to true.
     * @member {String} Config#protocolHeaders
     * @default
     * @since 1.0.0
     */
    protocolHeaders: 'x-forwarded-proto',

    /**
     * Detect request' ip from specified headers, not case-sensitive.
     * Only worked when config.proxy set to true.
     * @member {String} Config#ipHeaders
     * @default
     * @since 1.0.0
     */
    ipHeaders: 'x-forwarded-for',

    /**
     * Detect request' host from specified headers, not case-sensitive.
     * Only worked when config.proxy set to true.
     * @member {String} Config#hostHeaders
     * @default
     * @since 1.0.0
     */
    hostHeaders: '',

    /**
     * package.json
     * @member {Object} Config#pkg
     * @see {appInfo#pkg}
     * @since 1.0.0
     */
    pkg: appInfo.pkg,

    /**
     * The current directory of the application
     * @member {String} Config#baseDir
     * @see {appInfo#baseDir}
     * @since 1.0.0
     */
    baseDir: appInfo.baseDir,

    /**
     * The current HOME directory
     * @member {String} Config#HOME
     * @see {appInfo#HOME}
     * @since 1.0.0
     */
    HOME: appInfo.HOME,

    /**
     * The directory of server running. You can find `application_config.json` under it that is dumpped from `app.config`.
     * @member {String} Config#rundir
     * @default
     * @since 1.0.0
     */
    rundir: path.join(appInfo.baseDir, 'run'),

    /**
     * dump config
     *
     * It will ignore special keys when dumpConfig
     *
     * @member Config#dump
     * @property {Set} ignore - keys to ignore
     */
    dump: {
      ignore: new Set([
        'pass', 'pwd', 'passd', 'passwd', 'password', 'keys', 'masterKey', 'accessKey',
        // ignore any key contains "secret" keyword
        /secret/i,
      ]),
    },

    /**
     * configurations are confused to users
     * {
     *   [unexpectedKey]: [expectedKey],
     * }
     * @member Config#confusedConfigurations
     * @type {Object}
     */
    confusedConfigurations: {
      bodyparser: 'bodyParser',
      notFound: 'notfound',
      sitefile: 'siteFile',
      middlewares: 'middleware',
      httpClient: 'httpclient',
    },
  };

  /**
   * The option of `notfound` middleware
   *
   * It will return page or json depend on negotiation when 404,
   * If pageUrl is set, it will redirect to the page.
   *
   * @member Config#notfound
   * @property {String} pageUrl - the 404 page url
   */
  config.notfound = {
    pageUrl: '',
  };

  /**
   * The option of `siteFile` middleware
   *
   * You can map some files using this options, it will response immdiately when matching.
   *
   * @member {Object} Config#siteFile - key is path, and value is url or buffer.
   * @property {String} cacheControl - files cache , default is public, max-age=2592000
   * @example
   * // specific app's favicon, => '/favicon.ico': 'https://eggjs.org/favicon.ico',
   * config.siteFile = {
   *   '/favicon.ico': 'https://eggjs.org/favicon.ico',
   * };
   */
  config.siteFile = {
    '/favicon.ico': fs.readFileSync(path.join(__dirname, 'favicon.png')),
    // default cache in 30 days
    cacheControl: 'public, max-age=2592000',
  };

  /**
   * The option of `bodyParser` middleware
   *
   * @member Config#bodyParser
   * @property {Boolean} enable - enable bodyParser or not, default is true
   * @property {String | RegExp | Function | Array} ignore - won't parse request body when url path hit ignore pattern, can not set `ignore` when `match` presented
   * @property {String | RegExp | Function | Array} match - will parse request body only when url path hit match pattern
   * @property {String} encoding - body's encoding type，default is utf8
   * @property {String} formLimit - limit of the urlencoded body. If the body ends up being larger than this limit, a 413 error code is returned. Default is 1mb
   * @property {String} jsonLimit - limit of the json body, default is 1mb
   * @property {String} textLimit - limit of the text body, default is 1mb
   * @property {Boolean} strict - when set to true, JSON parser will only accept arrays and objects. Default is true
   * @property {Number} queryString.arrayLimit - urlencoded body array's max length, default is 100
   * @property {Number} queryString.depth - urlencoded body object's max depth, default is 5
   * @property {Number} queryString.parameterLimit - urlencoded body maximum parameters, default is 1000
   */
  config.bodyParser = {
    enable: true,
    encoding: 'utf8',
    formLimit: '1mb',
    jsonLimit: '1mb',
    textLimit: '1mb',
    strict: true,
    // @see https://github.com/hapijs/qs/blob/master/lib/parse.js#L8 for more options
    queryString: {
      arrayLimit: 100,
      depth: 5,
      parameterLimit: 1000,
    },
    onerror(err) {
      err.message += ', check bodyParser config';
      throw err;
    },
  };

  /**
   * logger options
   * @member Config#logger
   * @property {String} dir - directory of log files
   * @property {String} encoding - log file encoding, defaults to utf8
   * @property {String} level - default log level, could be: DEBUG, INFO, WARN, ERROR or NONE, defaults to INFO in production
   * @property {String} consoleLevel - log level of stdout, defaults to INFO in local serverEnv, defaults to WARN in unittest, defaults to NONE elsewise
   * @property {Boolean} disableConsoleAfterReady - disable logger console after app ready. defaults to `false` on local and unittest env, others is `true`.
   * @property {Boolean} outputJSON - log as JSON or not, defaults to false
   * @property {Boolean} buffer - if enabled, flush logs to disk at a certain frequency to improve performance, defaults to true
   * @property {String} errorLogName - file name of errorLogger
   * @property {String} coreLogName - file name of coreLogger
   * @property {String} agentLogName - file name of agent worker log
   * @property {Object} coreLogger - custom config of coreLogger
   * @property {Boolean} allowDebugAtProd - allow debug log at prod, defaults to false
   * @property {Boolean} enablePerformanceTimer - using performance.now() timer instead of Date.now() for more more precise milliseconds, defaults to false. e.g.: logger will set 1.456ms instead of 1ms.
   */
  config.logger = {
    dir: path.join(appInfo.root, 'logs', appInfo.name),
    encoding: 'utf8',
    env: appInfo.env,
    level: 'INFO',
    consoleLevel: 'INFO',
    disableConsoleAfterReady: appInfo.env !== 'local' && appInfo.env !== 'unittest',
    outputJSON: false,
    buffer: true,
    appLogName: `${appInfo.name}-web.log`,
    coreLogName: 'egg-web.log',
    agentLogName: 'egg-agent.log',
    errorLogName: 'common-error.log',
    coreLogger: {},
    allowDebugAtProd: false,
    enablePerformanceTimer: false,
  };

  /**
   * The option for httpclient
   * @member Config#httpclient
   * @property {Boolean} enableDNSCache - Enable DNS lookup from local cache or not, default is false.
   * @property {Boolean} dnsCacheLookupInterval - minimum interval of DNS query on the same hostname (default 10s).
   *
   * @property {Number} request.timeout - httpclient request default timeout, default is 5000 ms.
   *
   * @property {Boolean} httpAgent.keepAlive - Enable http agent keepalive or not, default is true
   * @property {Number} httpAgent.freeSocketTimeout - http agent socket keepalive max free time, default is 4000 ms.
   * @property {Number} httpAgent.maxSockets - http agent max socket number of one host, default is `Number.MAX_SAFE_INTEGER` @ses https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER
   * @property {Number} httpAgent.maxFreeSockets - http agent max free socket number of one host, default is 256.
   *
   * @property {Boolean} httpsAgent.keepAlive - Enable https agent keepalive or not, default is true
   * @property {Number} httpsAgent.freeSocketTimeout - httpss agent socket keepalive max free time, default is 4000 ms.
   * @property {Number} httpsAgent.maxSockets - https agent max socket number of one host, default is `Number.MAX_SAFE_INTEGER` @ses https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER
   * @property {Number} httpsAgent.maxFreeSockets - https agent max free socket number of one host, default is 256.
   * @property {Boolean} useHttpClientNext - use urllib@3 HttpClient
   */
  config.httpclient = {
    enableDNSCache: false,
    dnsCacheLookupInterval: 10000,
    dnsCacheMaxLength: 1000,

    request: {
      timeout: 5000,
    },
    httpAgent: {
      keepAlive: true,
      freeSocketTimeout: 4000,
      maxSockets: Number.MAX_SAFE_INTEGER,
      maxFreeSockets: 256,
    },
    httpsAgent: {
      keepAlive: true,
      freeSocketTimeout: 4000,
      maxSockets: Number.MAX_SAFE_INTEGER,
      maxFreeSockets: 256,
    },
    useHttpClientNext: false,
  };

  /**
   * The option of `meta` middleware
   *
   * @member Config#meta
   * @property {Boolean} enable - enable meta or not, default is true
   * @property {Boolean} logging - enable logging start request, default is false
   */
  config.meta = {
    enable: true,
    logging: false,
  };

  /**
   * core enable middlewares
   * @member {Array} Config#middleware
   */
  config.coreMiddleware = [
    'meta',
    'siteFile',
    'notfound',
    'bodyParser',
    'overrideMethod',
  ];

  /**
   * emit `startTimeout` if worker don't ready after `workerStartTimeout` ms
   * @member {Number} Config.workerStartTimeout
   */
  config.workerStartTimeout = 10 * 60 * 1000;

  /**
   * server timeout in milliseconds, default to 2 minutes.
   *
   * for special request, just use `ctx.req.setTimeout(ms)`
   *
   * @member {Number} Config#serverTimeout
   * @see https://nodejs.org/api/http.html#http_server_timeout
   */
  config.serverTimeout = null;

  /**
   *
   * @member {Object} Config#cluster
   * @property {Object} listen - listen options, see {@link https://nodejs.org/api/http.html#http_server_listen_port_hostname_backlog_callback}
   * @property {String} listen.path - set a unix sock path when server listen
   * @property {Number} listen.port - set a port when server listen
   * @property {String} listen.hostname - set a hostname binding server when server listen
   */
  config.cluster = {
    listen: {
      path: '',
      port: 7001,
      hostname: '',
    },
  };

  /**
   * @property {Number} responseTimeout - response timeout, default is 60000
   */
  config.clusterClient = {
    maxWaitTime: 60000,
    responseTimeout: 60000,
  };

  /**
   * This function / async function will be called when a client error occurred and return the response.
   *
   * The arguments are `err`, `socket` and `application` which indicate current client error object, current socket
   * object and the application object.
   *
   * The response to be returned should include properties below:
   *
   * @member {Function} Config#onClientError
   * @property [body] {String|Buffer} - the response body
   * @property [status] {Number} - the response status code
   * @property [headers] {Object} - the response header key-value pairs
   *
   * @example
   * exports.onClientError = async (err, socket, app) => {
   *   return {
   *     body: 'error',
   *     status: 400,
   *     headers: {
   *       'powered-by': 'Egg.js',
   *     }
   *   };
   * }
   */
  config.onClientError = null;

  return config;
};
