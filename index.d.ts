import * as accepts from 'accepts';
import * as KoaApplication from 'koa';
import * as KoaRouter from 'koa-router';
import { Readable } from 'stream';

/**
 * BaseContextClass is a base class that can be extended,
 * it's instantiated in context level,
 * {@link Helper}, {@link Service} is extending it.
 */
declare class BaseContextClass {
  /**
   * request context
   */
  public ctx: Context;

  /**
   * Application
   */
  public app: Application;

  /**
   * Application config object
   */
  public config: EggAppConfig;

  /**
   * service
   */
  public service: IService;

  constructor(ctx: Context);
}

interface Logger {
  info(info: string, ...args): void;
  warn(info: string, ...args): void;
  debug(info: string, ...args): void;
  error(info: string, ...args): void;
}

interface Request extends KoaApplication.Request {
  /**
   * detect if response should be json
   * 1. url path ends with `.json`
   * 2. response type is set to json
   * 3. detect by request accept header
   *
   * @member {Boolean} Request#acceptJSON
   * @since 1.0.0
   */
  acceptJSON: boolean;

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
  ip: string;

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
  ips: string[];

  protocol: string;

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
  queries: { [key: string]: string[] };

  /**
   * get params pass by querystring, all value are String type.
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
  query: { [key: string]: string };
}

interface Response extends KoaApplication.Response {
  /**
   * read response real status code.
   *
   * e.g.: Using 302 status redirect to the global error page
   * instead of show current 500 status page.
   * And access log should save 500 not 302,
   * then the `realStatus` can help us find out the real status code.
   * @member {Number} Context#realStatus
   */
  realStatus: number;
}

interface ContextView {
  /**
   * Render a file by view engine
   * @param {String} name - the file path based on root
   * @param {Object} [locals] - data used by template
   * @param {Object} [options] - view options, you can use `options.viewEngine` to specify view engine
   * @return {Promise<String>} result - return a promise with a render result
   */
  render(name: string, locals: any, options?): Promise<string>;

  /**
   * Render a template string by view engine
   * @param {String} tpl - template string
   * @param {Object} [locals] - data used by template
   * @param {Object} [options] - view options, you can use `options.viewEngine` to specify view engine
   * @return {Promise<String>} result - return a promise with a render result
   */
  renderString(name: string, locals: any, options?): Promise<string>;
}

type LoggerLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'NONE';

interface EggAppConfig {
  workerStartTimeout: number;
  baseDir: string;
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
  bodyParser: {
    enable: boolean;
    encoding: string;
    formLimit: string;
    jsonLimit: string;
    strict: true;
    queryString: {
      arrayLimit: number;
      depth: number;
      parameterLimit: number;
    };
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
  logger: {
    dir: string;
    encoding: string;
    env: string;
    level: LoggerLevel;
    consoleLevel: LoggerLevel;
    outputJSON: boolean;
    buffer: boolean;
    appLogName: string;
    coreLogName: string;
    agentLogName: string;
    errorLogName: string;
    coreLogger: any;
  };

  httpclient: {
    keepAlive: boolean;
    freeSocketKeepAliveTimeout: number;
    timeout: number;
    maxSockets: number;
    maxFreeSockets: number;
    enableDNSCache: boolean;
  };

  development: {
    /**
     * dirs needed watch, when files under these change, application will reload, use relative path
     */
    watchDirs: string[];
    /**
     * dirs don't need watch, including subdirectories, use relative path
     */
    ignoreDirs: string[];
    /**
     * don't wait all plugins ready, default is true.
     */
    fastReady: boolean;
  };
  /**
   * It will ignore special keys when dumpConfig
   */
  dump: {
    ignore: Set<string>;
  };

  /**
   * The environment of egg
   */
  env: string;

  /**
   * The current HOME directory
   */
  HOME: string;

  hostHeaders: string;

  /**
   * I18n options
   * @member Config#i18n
   * @property {String} defaultLocale - 默认语言是美式英语，毕竟支持多语言，基本都是以英语为母板
   * @property {String} dir - 多语言资源文件存放路径，不建议修改
   * @property {String} queryField - 设置当前语言的 query 参数字段名，默认通过 `query.locale` 获取
   *   如果你想修改为 `query.lang`，那么请通过修改此配置实现
   * @property {String} cookieField - 如果当前请求用户语言有变化，都会设置到 cookie 中保持着，
   *   默认是存储在key 为 locale 的 cookie 中
   * @property {String|Number} cookieMaxAge - cookie 默认 `1y` 一年后过期，
   *   如果设置为 Number，则单位为 ms
   */
  i18n: {
    defaultLocale: string;
    dir: string;
    queryField: string;
    cookieField: string;
    cookieMaxAge: string;
  };

  /**
   * Detect request' ip from specified headers, not case-sensitive. Only worked when config.proxy set to true.
   */
  ipHeaders: string;

  /**
   * jsonp options
   * @member Config#jsonp
   * @property {String} callback - jsonp callback method key, default to `_callback`
   * @property {Number} limit - callback method name's max length, default to `50`
   * @property {Boolean} csrf - enable csrf check or not. default to false
   * @property {String|RegExp|Array} whiteList - referrer white list
   */
  jsonp: {
    limit: number;
    callback: string;
    csrf: boolean;
    whiteList: string | RegExp | Array<string | RegExp>;
  };

  /**
   * The key that signing cookies. It can contain multiple keys seperated by .
   */
  keys: string;

  /**
   * The name of the application
   */
  name: string;

  /**
   * package.json
   */
  pkg: any;

  rundir: string;

  security: {
    domainWhiteList: string[];
    protocolWhiteList: string[];
    defaultMiddleware: string;
    csrf: any;
    xframe: {
      enable: boolean;
      value: 'SAMEORIGIN' | 'DENY' | 'ALLOW-FROM';
    };
    hsts: any;
    methodnoallow: { enable: boolean };
    noopen: { enable: boolean; }
    xssProtection: any;
    csp: any;
  };

  siteFile: any;

  static: any;

  view: any;

  watcher: any;
}

interface Router extends KoaRouter {
  /**
   * restful router api
   */
  resources(name: string, prefix: string, middleware: Function): Router;

  /**
   * @param {String} name - Router name
   * @param {Object} params - more parameters
   * @example
   * ```js
   * router.url('edit_post', { id: 1, name: 'foo', page: 2 })
   * => /posts/1/edit?name=foo&page=2
   * router.url('posts', { name: 'foo&1', page: 2 })
   * => /posts?name=foo%261&page=2
   * ```
   * @return {String} url by path name and query params.
   * @since 1.0.0
   */
  url(name: string, params: any): any;
}

declare interface EggApplication extends KoaApplication {
  /**
   * The current directory of application
   */
  baseDir: string;

  /**
   * The configuration of application
   */
  config: EggAppConfig;

  /**
   * app.env delegate app.config.env
   */
  env: string;

  Controller: Controller;

  /**
   * core logger for framework and plugins, log file is $HOME/logs/{appname}/egg-web
   */
  coreLogger: Logger;

  /**
   * Alias to https://npmjs.com/package/depd
   */
  deprecate: any;

  /**
   * HttpClient instance
   */
  httpclient: any;

  /**
   * The loader instance, the default class is EggLoader. If you want define
   */
  loader: any;

  /**
   * Logger for Application, wrapping app.coreLogger with context infomation
   *
   * @member {ContextLogger} Context#logger
   * @since 1.0.0
   * @example
   * ```js
   * this.logger.info('some request data: %j', this.request.body);
   * this.logger.warn('WARNING!!!!');
   * ```
   */
  logger: Logger;

  /**
   * All loggers contain logger, coreLogger and customLogger
   */
  loggers: { [loggerName: string]: Logger };

  /**
   * messenger instance
   */
  messenger: any;

  plugins: any;

  /**
   * get router
   */
  router: Router;

  Service: Service;

  /**
   * Whether `application` or `agent`
   */
  type: string;

  /**
   * create a singleton instance
   */
  addSingleton(name: string, create: any): void;

  /**
   * Excute scope after loaded and before app start
   */
  beforeStart(any): void;

  /**
   * Close all, it wil close
   * - callbacks registered by beforeClose
   * - emit `close` event
   * - remove add listeners
   *
   * If error is thrown when it's closing, the promise will reject.
   * It will also reject after following call.
   * @return {Promise} promise
   * @since 1.0.0
   */
  close(): Promise<any>;

  /**
   * http request helper base on httpclient, it will auto save httpclient log.
   * Keep the same api with httpclient.request(url, args).
   * See https://github.com/node-modules/urllib#api-doc for more details.
   */
  curl(url: string, opt: any): Promise<any>;

  /**
   * Get logger by name, it's equal to app.loggers['name'], but you can extend it with your own logical
   */
  getLogger(name: string): Logger;

  /**
   * print the infomation when console.log(app)
   */
  inspect(): any;

  /**
   * Alias to Router#url
   */
  url(name: string, params: any): any;
}

export interface Application extends EggApplication {

  /**
   * global locals for view
   * @see Context#locals
   */
  locals: any;

  /**
   * HTTP get method
   */
  get(path: string, fn: string): void;
  get(path: string, ...middleware: Array<any>): void;

  /**
   * HTTP post method
   */
  post(path: string, fn: string): void;
  post(path: string, ...middleware: Array<any>): void;

  /**
   * HTTP put method
   */
  put(path: string, fn: string): void;
  put(path: string, ...middleware): void;

  /**
   * HTTP delete method
   */
  delete(path: string, fn: string): void;
  delete(path: string, ...middleware: Array<any>): void;

  /**
   * restful router api
   */
  resources(name: string, prefix: string, fn: string): Router;

  redirect(path: string, redirectPath: string);

  Controller: {
    new(): Controller;
  };
}

interface FileStream extends Readable {
  fields: any;
}

export interface Context extends KoaApplication.Context {

  app: Application;

  service: IService;

  request: Request;

  response: Response;

  /**
   * 开启 {@link rest} 功能后，将会有 `this.params` 对象
   * @member {object} context#params
   * @example
   * ##### ctx.params.id {string}
   *
   * 资源 id，如 `GET /api/users/1` => `'1'`
   *
   * ##### ctx.params.ids {Array<String>}
   *
   * 一组资源 id，如 `GET /api/users/1,2,3` => `['1', '2', '3']`
   *
   * ##### ctx.params.fields {Array<String>}
   *
   * 期待返回的资源字段，如 `GET /api/users/1?fields=name,title` => `['name', 'title']`.
   * 即使应用 Controller 实现返回了全部字段，[REST] 处理器会根据 `fields` 筛选只需要的字段。
   *
   * ##### ctx.params.data {Object}
   *
   * 请求数据对象
   *
   * ##### ctx.params.page {Number}
   *
   * 分页码，如 `GET /api/users?page=10` => `10`
   *
   * ##### ctx.params.per_page {Number}
   *
   * 每页资源数目，如 `GET /api/users?per_page=20` => `20`
   */
  params: any;

  /**
   * @see Request#accept
   */
  queries: { [key: string]: string[] };

  /**
   * @see Request#accept
   */
  accept: accepts.Accepts;

  /**
   * @see Request#acceptJSON
   */
  acceptJSON: boolean;

  /**
   * @see Request#ip
   */
  ip: string;

  /**
   * @see Response#realStatus
   */
  realStatus: number;

  /**
   * 设置返回资源对象
   * @member {Object} Context#data=
   * @example
   * ```js
   * ctx.data = {
   *   id: 1,
   *   name: 'fengmk2'
   * };
   * ```
   *
   * 会返回 200 响应
   *
   * ```js
   * HTTP/1.1 200 OK
   *
   * {
   *   "data": {
   *     "id": 1,
   *     "name": "fengmk2"
   *   }
   * }
   * ```
   */
  data: any;

  /**
   * 设置 meta 响应数据
   * @member {Object} Context#meta=
   * @example
   * ```js
   * ctx.meta = {
   *   count: 100
   * };
   * ```
   *
   * 会返回 200 响应
   *
   * ```js
   * HTTP/1.1 200 OK
   *
   * {
   *   "meta": {
   *     "count": 100
   *   }
   * }
   * ```
   */
  meta: any;

  /**
   * locals is an object for view, you can use `app.locals` and `ctx.locals` to set variables,
   * which will be used as data when view is rendering.
   * The difference between `app.locals` and `ctx.locals` is the context level, `app.locals` is global level, and `ctx.locals` is request level. when you get `ctx.locals`, it will merge `app.locals`.
   *
   * when you set locals, only object is available
   *
   * ```js
   * this.locals = {
   *   a: 1
   * };
   * this.locals = {
   *   b: 1
   * };
   * this.locals.c = 1;
   * console.log(this.locals);
   * {
   *   a: 1,
   *   b: 1,
   *   c: 1,
   * };
   * ```
   *
   * `ctx.locals` has cache, it only merges `app.locals` once in one request.
   *
   * @member {Object} Context#locals
   */
  locals: any;

  /**
   * alias to {@link locals}, compatible with koa that use this variable
   */
  state: any;

  /**
   * Logger for Application, wrapping app.coreLogger with context infomation
   *
   * @member {ContextLogger} Context#logger
   * @since 1.0.0
   * @example
   * ```js
   * this.logger.info('some request data: %j', this.request.body);
   * this.logger.warn('WARNING!!!!');
   * ```
   */
  logger: Logger;

  /**
   * Request start time
   */
  starttime: number;

  /**
   * View instance that is created every request
   */
  view: ContextView;

  /**
   * http request helper base on httpclient, it will auto save httpclient log.
   * Keep the same api with httpclient.request(url, args).
   * See https://github.com/node-modules/urllib#api-doc for more details.
   */
  curl(url: string, opt: any): Promise<any>;

  /**
   * Render a file by view engine
   * @param {String} name - the file path based on root
   * @param {Object} [locals] - data used by template
   * @param {Object} [options] - view options, you can use `options.viewEngine` to specify view engine
   * @return {Promise<String>} result - return a promise with a render result
   */
  render(name: string, locals: any, options?): Promise<string>;

  /**
   * Render a template string by view engine
   * @param {String} tpl - template string
   * @param {Object} [locals] - data used by template
   * @param {Object} [options] - view options, you can use `options.viewEngine` to specify view engine
   * @return {Promise<String>} result - return a promise with a render result
   */
  renderString(name: string, locals: any, options?): Promise<string>;

  __(key: string, ...values): string;
  gettext(key: string, ...values): string;

  /**
   * get upload file stream
   * @example
   * ```js
   * const stream = yield this.getFileStream();
   * // get other fields
   * console.log(stream.fields);
   * ```
   * @method Context#getFileStream
   * @return {ReadStream} stream
   * @since 1.0.0
   */
  getFileStream(): Promise<FileStream>;

  /**
   * @see Responce.redirect
   */
  redirect(url: string, alt?: string): void;
}

export class Controller extends BaseContextClass { }

export class Service extends BaseContextClass { }

export interface IService { }
