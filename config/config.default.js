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
     * @see https://eggjs.org/zh-cn/basics/controller.html#cookie-秘钥
     * @default
     * @since 1.0.0
     */
    keys: '',

    /**
     * Whether application deployed after a reverse proxy,
     * when true proxy header fields will be trusted
     * @member {Boolean} Config#proxy
     * @default
     * @since 1.0.0
     */
    proxy: false,

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
    hostHeaders: 'x-forwarded-host',

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
      ignore: new Set([ 'pass', 'pwd', 'passd', 'passwd', 'password', 'keys', 'secret' ]),
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
   * @example
   * // 指定应用 favicon, => '/favicon.ico': 'https://eggjs.org/favicon.ico',
   * config.siteFile = {
   *   '/favicon.ico': 'https://eggjs.org/favicon.ico',
   * };
   */
  config.siteFile = {
    '/favicon.ico': fs.readFileSync(path.join(__dirname, 'favicon.png')),
  };

  /**
   * The option of `bodyParser` middleware
   *
   * @member Config#bodyParser
   * @property {Boolean} enable - enable bodyParser or not, default to true
   * @property {String | RegExp | Function | Array} ignore - won't parse request body when url path hit ignore pattern, can not set `ignore` when `match` presented
   * @property {String | RegExp | Function | Array} match - will parse request body only when url path hit match pattern
   * @property {String} encoding - body 的编码格式，默认为 utf8
   * @property {String} formLimit - form body 的大小限制，默认为 100kb
   * @property {String} jsonLimit - json body 的大小限制，默认为 100kb
   * @property {Boolean} strict - json body 解析是否为严格模式，如果为严格模式则只接受 object 和 array
   * @property {Number} queryString.arrayLimit - 表单元素数组长度限制，默认 100，否则会转换为 json 格式
   * @property {Number} queryString.depth - json 数值深度限制，默认 5
   * @property {Number} queryString.parameterLimit - 参数个数限制，默认 1000
   */
  config.bodyParser = {
    enable: true,
    encoding: 'utf8',
    formLimit: '100kb',
    jsonLimit: '100kb',
    strict: true,
    // @see https://github.com/hapijs/qs/blob/master/lib/parse.js#L8 for more options
    queryString: {
      arrayLimit: 100,
      depth: 5,
      parameterLimit: 1000,
    },
  };

  /**
   * logger options
   * @member Config#logger
   * @property {String} dir - directory of log files
   * @property {String} encoding - log file encloding, defaults to utf8
   * @property {String} level - default log level, could be: DEBUG, INFO, WARN, ERROR or NONE, defaults to INFO in production
   * @property {String} consoleLevel - log level of stdout, defaults to INFO in local serverEnv, defaults to WARN in unittest, defaults to NONE elsewise
   * @property {Boolean} outputJSON - log as JSON or not, defaults to false
   * @property {Boolean} buffer - if enabled, flush logs to disk at a certain frequency to improve performance, defaults to true
   * @property {String} errorLogName - file name of errorLogger
   * @property {String} coreLogName - file name of coreLogger
   * @property {String} agentLogName - file name of agent worker log
   * @property {Object} coreLogger - custom config of coreLogger
   */
  config.logger = {
    dir: path.join(appInfo.root, 'logs', appInfo.name),
    encoding: 'utf8',
    env: appInfo.env,
    level: 'INFO',
    consoleLevel: 'INFO',
    outputJSON: false,
    buffer: true,
    appLogName: `${appInfo.name}-web.log`,
    coreLogName: 'egg-web.log',
    agentLogName: 'egg-agent.log',
    errorLogName: 'common-error.log',
    coreLogger: {},
  };

  /**
   * The option for httpclient
   * @member Config#httpclient
   * @property {Boolean} keepAlive - Enable http keepalive or not, default is true
   * @property {Number} freeSocketKeepAliveTimeout - socket keepalive max free time, default is 4000 ms.
   * @property {Number} timeout - socket max unative time, default is 30000 ms.
   * @property {Number} maxSockets - max socket number of one host, default is Infinity.
   * @property {Number} maxFreeSockets - max free socket number of one host, default is 256.
   * @property {Boolean} enableDNSCache - Enable DNS lookup from local cache or not, default is false.
   */
  config.httpclient = {
    keepAlive: true,
    freeSocketKeepAliveTimeout: 4000,
    timeout: 30000,
    maxSockets: Infinity,
    maxFreeSockets: 256,
    enableDNSCache: false,
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
  ];

  /**
   * The options of `jsonp` plugin
   * @member Config#jsonp
   * @property {String} callback - the method name，default is `_callback`
   * @property {Number} limit - the max length of the method name，default is `50`
   */
  config.jsonp = {
    callback: '_callback',
    limit: 50,
  };

  /**
   * emit `startTimeout` if worker don't ready after `workerStartTimeout` ms
   * @member {Number} Config.workerStartTimeout
   */
  config.workerStartTimeout = 10 * 60 * 1000;

  return config;
};
