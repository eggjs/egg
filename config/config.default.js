'use strict';

const fs = require('fs');
const path = require('path');

// https://github.com/eggjs/egg-core#appinfo
module.exports = appInfo => {

  const exports = {

    /**
     * runtime env
     * @member {String} Config#env
     * @since 1.0.0
     */
    env: appInfo.env,

    /**
     * app name
     * @member {String} Config#name
     * @since 1.0.0
     */
    name: appInfo.name,

    /**
     * Should set by every app itself
     * @member {String} Config#keys
     * @since 1.0.0
     */
    keys: '',

    /**
     * is application deployed after reverse proxy
     * when true proxy header fields will be trusted
     * @member Config#proxy
     * @since 1.0.0
     * @type {Boolean}
     */
    proxy: false,

    /**
     * Detect request' protocol from specified headers, not case-sensitive.
     * Only worked when config.proxy set to true.
     * @member {String} Config#protocolHeaders
     * @since 1.0.0
     */
    protocolHeaders: 'x-forwarded-proto',

    /**
     * Detect request' ip from specified headers, not case-sensitive.
     * Only worked when config.proxy set to true.
     * @member {String} Config#ipHeaders
     * @since 1.0.0
     */
    ipHeaders: 'x-forwarded-for',

    /**
     * Detect request' host from specified headers, not case-sensitive.
     * Only worked when config.proxy set to true.
     * @member {String} Config#hostHeaders
     * @since 1.0.0
     */
    hostHeaders: 'x-forwarded-host',

    /**
     * package.json object
     * @member {Object} Config#pkg
     * @since 1.0.0
     */
    pkg: appInfo.pkg,

    /**
     * app base dir
     * @member {String} Config#baseDir
     * @since 1.0.0
     */
    baseDir: appInfo.baseDir,

    /**
     * current user HOME dir
     * @member {String} Config#HOME
     * @since 1.0.0
     */
    HOME: appInfo.HOME,

    /**
     * store runtime info dir
     * @member {String} Config#rundir
     * @since 1.0.0
     * @private
     */
    rundir: path.join(appInfo.baseDir, 'run'),
  };

  /**
   * notfound 中间件 options
   *
   * 指定应用 404 页面
   *
   * 只有在 `enableRedirect === true && pageUrl` 才会真正 302 跳转到友好的404页面。
   *
   * @member Config#notfound
   * @property {String} pageUrl - 默认为空，不设置全局统一 404 页面
   * @property {Boolean} enableRedirect - 是否跳转到 global404Url，默认在 local 为 false，其他为 true
   * ```
   */
  exports.notfound = {
    pageUrl: '',
    enableRedirect: appInfo.env === 'prod',
  };

  /**
   * siteFile options
   * @member Config#siteFile
   * key 值为 path，若 value 为 url，则 redirect，若 value 为文件 buffer，则直接返回此文件
   * @example
   *  - 指定应用 favicon, => '/favicon.ico': 'https://eggjs.org/favicon.ico',
   *  - 指定应用 crossdomain.xml, => '/crossdomain.xml': fs.readFileSync('path_to_file')
   *  - 指定应用 robots.txt, => '/robots.txt': fs.readFileSync('path_to_file')
   *
   * ```js
   * exports.siteFile = {
   *   '/favicon.ico': 'https://eggjs.org/favicon.ico',
   * };
   */
  exports.siteFile = {
    '/favicon.ico': fs.readFileSync(path.join(__dirname, 'favicon.png')),
  };

  /**
   * bodyParser options
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
  exports.bodyParser = {
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
  exports.logger = {
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
   * httpclient options
   * @member Config#httpclient
   * @property {Boolean} keepAlive - Enable http keepalive or not, default is true
   * @property {Number} freeSocketKeepAliveTimeout - socket keepalive max free time, default is 4000 ms.
   * @property {Number} timeout - socket max unative time, default is 30000 ms.
   * @property {Number} maxSockets - max socket number of one host, default is Infinity.
   * @property {Number} maxFreeSockets - max free socket number of one host, default is 256.
   * @property {Boolean} enableDNSCache - Enable DNS lookup from local cache or not, default is false.
   */
  exports.httpclient = {
    keepAlive: true,
    freeSocketKeepAliveTimeout: 4000,
    timeout: 30000,
    maxSockets: Infinity,
    maxFreeSockets: 256,
    enableDNSCache: false,
  };

  /**
   * 定义 core 中间件加载的顺序，中间件的名称会映射到 app.middlewares 上
   * @member {Array} Config#middleware
   */
  exports.coreMiddleware = [
    'meta',
    'siteFile',
    'notfound',
    'bodyParser',
    'overrideMethod',
  ];

  /**
   * jsonp options
   * @member Config#jsonp
   * @property {String} callback - jsonp 的 callback 方法参数名，默认为 `_callback`
   * @property {Number} limit - callback 方法名称最大长度，默认为 `50`
   */
  exports.jsonp = {
    callback: '_callback',
    limit: 50,
  };

  /**
   * emit `startTimeout` if worker don't ready after `workerStartTimeout` ms
   * @member {Number} Config.workerStartTimeout
   */
  exports.workerStartTimeout = 10 * 60 * 1000;

  return exports;
};
