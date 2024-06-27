import accepts = require('accepts');
import { AsyncLocalStorage } from 'async_hooks';
import { EventEmitter } from 'events'
import { Readable } from 'stream';
import { Socket } from 'net';
import { IncomingMessage, ServerResponse } from 'http';
import KoaApplication = require('koa');
import KoaRouter = require('koa-router');
import {
  EggLogger as Logger,
  EggLoggers,
  LoggerLevel as EggLoggerLevel,
  EggLoggersOptions,
  EggLoggerOptions,
  EggContextLogger,
} from 'egg-logger';
import {
  RequestOptions2 as RequestOptionsOld,
  HttpClientResponse as HttpClientResponseOld,
} from 'urllib';
import {
  RequestURL as HttpClientRequestURL,
  RequestOptions as HttpClientRequestOptions,
  HttpClientResponse,
} from 'urllib-next';
import {
  EggCoreBase,
  FileLoaderOption,
  EggLoader as CoreLoader,
  EggCoreOptions as CoreOptions,
  EggLoaderOptions as CoreLoaderOptions,
  BaseContextClass as CoreBaseContextClass,
} from 'egg-core';
import EggCookies = require('egg-cookies');
import 'egg-onerror';
import 'egg-session';
import 'egg-i18n';
import 'egg-watcher';
import 'egg-multipart';
import 'egg-security';
import 'egg-development';
import 'egg-logrotator';
import 'egg-schedule';
import 'egg-static';
import 'egg-jsonp';
import 'egg-view';

declare module 'egg' {
  export type EggLogger = Logger;
  // plain object
  type PlainObject<T = any> = { [key: string]: T };

  // Remove specific property from the specific class
  type RemoveSpecProp<T, P> = Pick<T, Exclude<keyof T, P>>;

  // Usage:
  // ```ts
  // import { HttpClientRequestURL, HttpClientRequestOptions, HttpClientResponse } from 'egg';
  // async function request(url: HttpClientRequestURL, options: HttpClientRequestOptions): Promise<HttpClientResponse> {
  //   return await app.httpclient.request(url, options);
  // }
  // ```
  export { HttpClientRequestURL, HttpClientRequestOptions, HttpClientResponse };
  // Compatible with both urllib@2 and urllib@3 RequestOptions to request
  export interface EggHttpClient extends EventEmitter {
    request<T = any>(url: HttpClientRequestURL): Promise<HttpClientResponseOld<T> | HttpClientResponse<T>>;
    request<T = any>(url: HttpClientRequestURL, options: RequestOptionsOld | HttpClientRequestOptions):
      Promise<HttpClientResponseOld<T> | HttpClientResponse<T>>;
    curl<T = any>(url: HttpClientRequestURL): Promise<HttpClientResponseOld<T> | HttpClientResponse<T>>;
    curl<T = any>(url: HttpClientRequestURL, options: RequestOptionsOld | HttpClientRequestOptions):
      Promise<HttpClientResponseOld<T> | HttpClientResponse<T>>;
  }

  interface EggHttpConstructor {
    new(app: Application): EggHttpClient;
  }

  export interface EggContextHttpClient extends EggHttpClient { }
  interface EggContextHttpClientConstructor {
    new(ctx: Context): EggContextHttpClient;
  }

  /**
   * BaseContextClass is a base class that can be extended,
   * it's instantiated in context level,
   * {@link Helper}, {@link Service} is extending it.
   */
  export class BaseContextClass extends CoreBaseContextClass<Context, Application, EggAppConfig, IService> { // tslint:disable-line
    /**
     * logger
     */
    protected logger: EggLogger;
  }

  export class Boot {
    /**
     * logger
     * @member {EggLogger}
     */
    protected logger: EggLogger;

    /**
     * The configuration of application
     * @member {EggAppConfig}
     */
    protected config: EggAppConfig;

    /**
     * The instance of agent
     * @member {Agent}
     */
    protected agent: Agent;

    /**
     * The instance of app
     * @member {Application}
     */
    protected app: Application;
  }

  export type RequestArrayBody = any[];
  export type RequestObjectBody = PlainObject;
  export interface Request extends KoaApplication.Request { // tslint:disable-line
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
    queries: PlainObject<string[]>;

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
    query: PlainObject<string>;

    body: any;
  }

  export interface Response<ResponseBodyT = any> extends KoaApplication.Response { // tslint:disable-line
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
    body: ResponseBodyT;
  }

  export type LoggerLevel = EggLoggerLevel;


  /**
   * egg app info
   * @example
   * ```js
   * // config/config.default.ts
   * import { EggAppInfo } from 'egg';
   *
   * export default (appInfo: EggAppInfo) => {
   *   return {
   *     keys: appInfo.name + '123456',
   *   };
   * }
   * ```
   */
  export interface EggAppInfo {
    pkg: any; // package.json
    name: string; // the application name from package.json
    baseDir: string; // current directory of application
    env: EggEnvType; // equals to serverEnv
    HOME: string; // home directory of the OS
    root: string; // baseDir when local and unittest, HOME when other environment
  }

  type IgnoreItem = string | RegExp | ((ctx: Context) => boolean);
  type IgnoreOrMatch = IgnoreItem | IgnoreItem[];

  /** logger config of egg */
  export interface EggLoggerConfig extends RemoveSpecProp<EggLoggersOptions, 'type'> {
    /** custom config of coreLogger */
    coreLogger?: Partial<EggLoggerOptions>;
    /** allow debug log at prod, defaults to `false` */
    allowDebugAtProd?: boolean;
    /** disable logger console after app ready. defaults to `false` on local and unittest env, others is `true`. */
    disableConsoleAfterReady?: boolean;
    /** using performance.now() timer instead of Date.now() for more more precise milliseconds, defaults to `false`. e.g.: logger will set 1.456ms instead of 1ms. */
    enablePerformanceTimer?: boolean;
    /** using the app logger instead of EggContextLogger, defaults to `false` */
    enableFastContextLogger?: boolean;
  }

  /** Custom Loader Configuration */
  export interface CustomLoaderConfig extends RemoveSpecProp<FileLoaderOption, 'inject' | 'target'> {
    /**
     * an object you wanner load to, value can only be 'ctx' or 'app'. default to app
     */
    inject?: 'ctx' | 'app';
    /**
     * whether need to load files in plugins or framework, default to false
     */
    loadunit?: boolean;
  }

  export interface HttpClientBaseConfig {
    /** Whether use http keepalive */
    keepAlive?: boolean;
    /** Free socket after keepalive timeout */
    freeSocketKeepAliveTimeout?: number;
    /** Free socket after request timeout */
    freeSocketTimeout?: number;
    /** Request timeout */
    timeout?: number;
    /** Determines how many concurrent sockets the agent can have open per origin */
    maxSockets?: number;
    /** The maximum number of sockets that will be left open in the free state */
    maxFreeSockets?: number;
  }

  /** HttpClient config */
  export interface HttpClientConfig extends HttpClientBaseConfig {
    /** http.Agent */
    httpAgent?: HttpClientBaseConfig;
    /** https.Agent */
    httpsAgent?: HttpClientBaseConfig;
    /** Default request args for httpclient */
    request?: HttpClientRequestOptions | RequestOptionsOld;
    /** Whether enable dns cache */
    enableDNSCache?: boolean;
    /** Enable proxy request. Default is `false`. */
    enableProxy?: boolean;
    /** proxy agent uri or options. Default is `null`. */
    proxy?: string | { [key: string]: any };
    /** DNS cache lookup interval */
    dnsCacheLookupInterval?: number;
    /** DNS cache max age */
    dnsCacheMaxLength?: number;
    /** use urllib@3 HttpClient. Default is `false`  */
    useHttpClientNext?: boolean;
    /** Allow to use HTTP2 first, only work on `useHttpClientNext = true`. Default is `false` */
    allowH2?: boolean;
  }

  export interface EggAppConfig {
    workerStartTimeout: number;
    baseDir: string;
    middleware: string[];

    /**
     * The option of `bodyParser` middleware
     *
     * @member Config#bodyParser
     * @property {Boolean} enable - enable bodyParser or not, default to true
     * @property {String | RegExp | Function | Array} ignore - won't parse request body when url path hit ignore pattern, can not set `ignore` when `match` presented
     * @property {String | RegExp | Function | Array} match - will parse request body only when url path hit match pattern
     * @property {String} encoding - body encoding config, default utf8
     * @property {String} formLimit - form body size limit, default 1mb
     * @property {String} jsonLimit - json body size limit, default 1mb
     * @property {String} textLimit - json body size limit, default 1mb
     * @property {Boolean} strict - json body strict mode, if set strict value true, then only receive object and array json body
     * @property {Number} queryString.arrayLimit - from item array length limit, default 100
     * @property {Number} queryString.depth - json value deep length, default 5
     * @property {Number} queryString.parameterLimit - parameter number limit, default 1000
     * @property {String[]} enableTypes - parser will only parse when request type hits enableTypes, default is ['json', 'form']
     * @property {Object} extendTypes - support extend types
     * @property {String} onProtoPoisoning - Defines what action must take when parsing a JSON object with `__proto__`. Possible values are `'error'`, `'remove'` and `'ignore'`. Default is `'error'`, it will return `400` response when `Prototype-Poisoning` happen.
     */
    bodyParser: {
      enable: boolean;
      encoding: string;
      formLimit: string;
      jsonLimit: string;
      textLimit: string;
      strict: boolean;
      queryString: {
        arrayLimit: number;
        depth: number;
        parameterLimit: number;
      };
      ignore: IgnoreOrMatch;
      match: IgnoreOrMatch;
      enableTypes: string[];
      extendTypes: {
        json: string[];
        form: string[];
        text: string[];
      };
      /** Default is `'error'`, it will return `400` response when `Prototype-Poisoning` happen. */
      onProtoPoisoning: 'error' | 'remove' | 'ignore';
    };

    /**
     * logger options
     * @member Config#logger
     * @property {String} dir - directory of log files
     * @property {String} encoding - log file encloding, defaults to utf8
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
     * @property {Boolean} enableFastContextLogger - using the app logger instead of EggContextLogger, defaults to false
     */
    logger: EggLoggerConfig;

    /** custom logger of egg */
    customLogger: {
      [key: string]: EggLoggerOptions;
    };

    /** Configuration of httpclient in egg. */
    httpclient: HttpClientConfig;

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
      /**
       * whether reload on debug, default is true.
       */
      reloadOnDebug: boolean;
      /**
       * whether override default watchDirs, default is false.
       */
      overrideDefault: boolean;
      /**
       * whether override default ignoreDirs, default is false.
       */
      overrideIgnore: boolean;
      /**
       * whether to reload, use https://github.com/sindresorhus/multimatch
       */
      reloadPattern: string[] | string;
    };

    /**
     * customLoader config
     */
    customLoader: {
      [key: string]: CustomLoaderConfig;
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
    env: EggEnvType;

    /**
     * The current HOME directory
     */
    HOME: string;

    hostHeaders: string;

    /**
     * I18n options
     */
    i18n: {
      /**
       * default value EN_US
       */
      defaultLocale: string;
      /**
       * i18n resource file dir, not recommend to change default value
       */
      dirs: string[];
      /**
       * custom the locale value field, default `query.locale`, you can modify this config, such as `query.lang`
       */
      queryField: string;
      /**
       * The locale value key in the cookie, default is locale.
       */
      cookieField: string;
      /**
       * Locale cookie expire time, default `1y`, If pass number value, the unit will be ms
       */
      cookieMaxAge: string | number;
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
      ssrf: {
        ipBlackList: string[];
        ipExceptionList: string[];
        checkAddress?(ip: string): boolean;
      };
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

    siteFile: PlainObject<string | Buffer>;

    watcher: PlainObject;

    onClientError(err: Error, socket: Socket, app: EggApplication): ClientErrorResponse | Promise<ClientErrorResponse>;

    /**
     * server timeout in milliseconds, default to 0 (no timeout).
     *
     * for special request, just use `ctx.req.setTimeout(ms)`
     *
     * @see https://nodejs.org/api/http.html#http_server_timeout
     */
    serverTimeout: number | null;

    [prop: string]: any;
  }

  export interface ClientErrorResponse {
    body: string | Buffer;
    status: number;
    headers: { [key: string]: string };
  }

  export interface Router extends Omit<KoaRouter<any, Context>, 'url'> {
    /**
     * restful router api
     */
    resources(name: string, prefix: string, ...middleware: any[]): Router;

    /**
     * @param {String} name - Router name
     * @param {Object} [params] - more parameters
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
    url(name: string, params?: any): string;
    /**
     * Alias for the url method
     */
    pathFor(name: string, params?: any): string;
    methods: string[];
  }

  export interface EggApplication extends Omit<EggCoreBase<EggAppConfig>, 'ctxStorage' | 'currentContext'> {
    /**
     * HttpClient instance
     */
    httpclient: EggHttpClient;

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
    logger: EggLogger;

    /**
     * core logger for framework and plugins, log file is $HOME/logs/{appname}/egg-web
     */
    coreLogger: EggLogger;

    /**
     * All loggers contain logger, coreLogger and customLogger
     */
    loggers: EggLoggers;

    /**
     * messenger instance
     */
    messenger: Messenger;

    /**
     * get router
     */
    router: Router;

    /**
     * create a singleton instance
     */
    addSingleton(name: string, create: any): void;

    runSchedule(schedulePath: string, ...args: any[]): Promise<any>;

    /**
     * http request helper base on httpclient, it will auto save httpclient log.
     * Keep the same api with httpclient.request(url, args).
     * See https://github.com/node-modules/urllib#api-doc for more details.
     */
    curl: EggHttpClient['request'];

    /**
     * Get logger by name, it's equal to app.loggers['name'], but you can extend it with your own logical
     */
    getLogger(name: string): EggLogger;

    /**
     * print the infomation when console.log(app)
     */
    inspect(): any;

    /**
     * Alias to Router#url
     */
    url(name: string, params: any): any;

    /**
     * Create an anonymous context, the context isn't request level, so the request is mocked.
     * then you can use context level API like `ctx.service`
     * @member {String} EggApplication#createAnonymousContext
     * @param {Request} req - if you want to mock request like querystring, you can pass an object to this function.
     * @return {Context} context
     */
    createAnonymousContext(req?: Request): Context;

    /**
     * export context base classes, let framework can impl sub class and over context extend easily.
     */
    ContextCookies: typeof EggCookies;
    ContextLogger: typeof EggContextLogger;
    ContextHttpClient: EggContextHttpClientConstructor;
    HttpClient: EggHttpConstructor;
    Subscription: typeof Subscription;
    Controller: typeof Controller;
    Service: typeof Service;
  }

  // compatible
  export class EggApplication {
    constructor(options?: CoreOptions);
  }

  export type RouterPath = string | RegExp;

  export class Application extends EggApplication {
    /**
     * global locals for view
     * @see Context#locals
     */
    locals: IApplicationLocals;

    /**
     * HTTP get method
     */
    get(path: RouterPath, fn: string): void;
    get(path: RouterPath, ...middleware: any[]): void;

    /**
     * HTTP post method
     */
    post(path: RouterPath, fn: string): void;
    post(path: RouterPath, ...middleware: any[]): void;

    /**
     * HTTP put method
     */
    put(path: RouterPath, fn: string): void;
    put(path: RouterPath, ...middleware: any[]): void;

    /**
     * HTTP patch method
     */
    patch(path: RouterPath, fn: string): void;
    patch(path: RouterPath, ...middleware: any[]): void;

    /**
     * HTTP delete method
     */
    delete(path: RouterPath, fn: string): void;
    delete(path: RouterPath, ...middleware: any[]): void;

    /**
     * restful router api
     */
    resources(name: string, prefix: string, fn: string): Router;
    resources(path: string, prefix: string, ...middleware: any[]): Router;

    redirect(path: string, redirectPath: string): void;

    controller: IController;

    middleware: KoaApplication.Middleware[] & IMiddleware;

    /**
     * Run async function in the background
     * @see Context#runInBackground
     * @param {Function} scope - the first args is an anonymous ctx
     */
    runInBackground(scope: (ctx: Context) => void): void;

    /**
     * Run async function in the anonymous context scope
     * @see Context#runInAnonymousContextScope
     * @param {Function} scope - the first args is an anonymous ctx, scope should be async function
     * @param {Request} req - if you want to mock request like querystring, you can pass an object to this function.
     */
    runInAnonymousContextScope<R>(scope: (ctx: Context) => Promise<R>, req?: Request): Promise<R>;

    /**
     * Get current execute ctx async local storage
     * @returns {AsyncLocalStorage} localStorage - store current execute Context
     */
    get ctxStorage(): AsyncLocalStorage<Context>;

    /**
     * Get current execute ctx, maybe undefined
     * @returns {Context} ctx - current execute Context
     */
    get currentContext(): Context;
  }

  export interface IApplicationLocals extends PlainObject { }

  export interface FileStream extends Readable { // tslint:disable-line
    fields: any;

    filename: string;

    fieldname: string;

    mime: string;

    mimeType: string;

    transferEncoding: string;

    encoding: string;

    truncated: boolean;
  }

  interface GetFileStreamOptions {
    requireFile?: boolean; // required file submit, default is true
    defCharset?: string;
    limits?: {
      fieldNameSize?: number;
      fieldSize?: number;
      fields?: number;
      fileSize?: number;
      files?: number;
      parts?: number;
      headerPairs?: number;
    };
    checkFile?(
      fieldname: string,
      file: any,
      filename: string,
      encoding: string,
      mimetype: string
    ): void | Error;
  }

  /**
  * KoaApplication's Context will carry the default 'cookie' property in
  * the egg's Context interface, which is wrong here because we have our own
  * special properties (e.g: encrypted). So we must remove this property and
  * create our own with the same name.
  * @see https://github.com/eggjs/egg/pull/2958
  *
  * However, the latest version of Koa has "[key: string]: any" on the
  * context, and there'll be a type error for "keyof koa.Context".
  * So we have to directly inherit from "KoaApplication.BaseContext" and
  * rewrite all the properties to be compatible with types in Koa.
  * @see https://github.com/eggjs/egg/pull/3329
  */
  export interface Context<ResponseBodyT = any> extends KoaApplication.BaseContext {
    [key: string]: any;
    body: ResponseBodyT;

    app: Application;

    // properties of koa.Context
    req: IncomingMessage;
    res: ServerResponse;
    originalUrl: string;
    respond?: boolean;

    service: IService;

    request: Request;

    response: Response<ResponseBodyT>;

    // The new 'cookies' instead of Koa's.
    cookies: EggCookies;

    helper: IHelper;

    /**
     * Resource Parameters
     * @example
     * ##### ctx.params.id {string}
     *
     * `GET /api/users/1` => `'1'`
     *
     * ##### ctx.params.ids {Array<String>}
     *
     * `GET /api/users/1,2,3` => `['1', '2', '3']`
     *
     * ##### ctx.params.fields {Array<String>}
     *
     * Expect request return data fields, for example
     * `GET /api/users/1?fields=name,title` => `['name', 'title']`.
     *
     * ##### ctx.params.data {Object}
     *
     * Tht request data object
     *
     * ##### ctx.params.page {Number}
     *
     * Page number, `GET /api/users?page=10` => `10`
     *
     * ##### ctx.params.per_page {Number}
     *
     * The number of every page, `GET /api/users?per_page=20` => `20`
     */
    params: any;

    /**
     * @see Request#query
     */
    query: PlainObject<string>;

    /**
     * @see Request#queries
     */
    queries: PlainObject<string[]>;

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
     * Set the ctx.body.data value
     *
     * @member {Object} Context#data=
     * @example
     * ```js
     * ctx.data = {
     *   id: 1,
     *   name: 'fengmk2'
     * };
     * ```
     *
     * will get responce
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
     * set ctx.body.meta value
     *
     * @example
     * ```js
     * ctx.meta = {
     *   count: 100
     * };
     * ```
     * will get responce
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
    locals: IApplicationLocals & IContextLocals;

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
    logger: EggLogger;

    /**
     * Get logger by name, it's equal to app.loggers['name'], but you can extend it with your own logical
     */
    getLogger(name: string): EggLogger;

    /**
     * Request start time
     */
    starttime: number;

    /**
     * Request start timer using `performance.now()`
     */
    performanceStarttime?: number;

    /**
     * http request helper base on httpclient, it will auto save httpclient log.
     * Keep the same api with httpclient.request(url, args).
     * See https://github.com/node-modules/urllib#api-doc for more details.
     */
    curl: EggHttpClient['request'];

    __(key: string, ...values: string[]): string;
    gettext(key: string, ...values: string[]): string;

    /**
     * get upload file stream
     * @example
     * ```js
     * const stream = await this.getFileStream();
     * // get other fields
     * console.log(stream.fields);
     * ```
     * @method Context#getFileStream
     * @param {Object} options
     * @return {ReadStream} stream
     * @since 1.0.0
     */
    getFileStream(options?: GetFileStreamOptions): Promise<FileStream>;

    /**
     * @see Responce.redirect
     */
    redirect(url: string, alt?: string): void;

    httpclient: EggContextHttpClient;
  }

  export interface IContextLocals extends PlainObject { }

  export class Controller extends BaseContextClass { }

  export class Service extends BaseContextClass { }

  export class Subscription extends BaseContextClass { }

  /**
   * The empty interface `IService` is a placeholder, for egg
   * to auto injection service to ctx.service
   *
   * @example
   *
   * import { Service } from 'egg';
   * class FooService extends Service {
   *   async bar() {}
   * }
   *
   * declare module 'egg' {
   *   export interface IService {
   *     foo: FooService;
   *   }
   * }
   *
   * Now I can get ctx.service.foo at controller and other service file.
   */
  export interface IService extends PlainObject { } // tslint:disable-line

  export interface IController extends PlainObject { } // tslint:disable-line

  export interface IMiddleware extends PlainObject { } // tslint:disable-line

  export interface IHelper extends PlainObject, BaseContextClass {
    /**
     * Generate URL path(without host) for route. Takes the route name and a map of named params.
     * @method Helper#pathFor
     * @param {String} name - Router Name
     * @param {Object} params - Other params
     *
     * @example
     * ```js
     * app.get('home', '/index.htm', 'home.index');
     * ctx.helper.pathFor('home', { by: 'recent', limit: 20 })
     * => /index.htm?by=recent&limit=20
     * ```
     * @return {String} url path(without host)
     */
    pathFor(name: string, params?: PlainObject): string;

    /**
     * Generate full URL(with host) for route. Takes the route name and a map of named params.
     * @method Helper#urlFor
     * @param {String} name - Router name
     * @param {Object} params - Other params
     * @example
     * ```js
     * app.get('home', '/index.htm', 'home.index');
     * ctx.helper.urlFor('home', { by: 'recent', limit: 20 })
     * => http://127.0.0.1:7001/index.htm?by=recent&limit=20
     * ```
     * @return {String} full url(with host)
     */
    urlFor(name: string, params?: PlainObject): string;
  }

  // egg env type
  export type EggEnvType = 'local' | 'unittest' | 'prod' | string;

  /**
   * plugin config item interface
   */
  export interface IEggPluginItem {
    env?: EggEnvType[];
    path?: string;
    package?: string;
    enable?: boolean;
  }

  export type EggPluginItem = IEggPluginItem | boolean;

  /**
   * build-in plugin list
   */
  export interface EggPlugin {
    [key: string]: EggPluginItem | undefined;
    onerror?: EggPluginItem;
    session?: EggPluginItem;
    i18n?: EggPluginItem;
    watcher?: EggPluginItem;
    multipart?: EggPluginItem;
    security?: EggPluginItem;
    development?: EggPluginItem;
    logrotator?: EggPluginItem;
    schedule?: EggPluginItem;
    static?: EggPluginItem;
    jsonp?: EggPluginItem;
    view?: EggPluginItem;
  }

  /**
   * Singleton instance in Agent Worker, extend {@link EggApplication}
   */
  export class Agent extends EggApplication {
  }

  export interface ClusterOptions {
    /** specify framework that can be absolute path or npm package */
    framework?: string;
    /** directory of application, default to `process.cwd()` */
    baseDir?: string;
    /** customized plugins, for unittest */
    plugins?: object | null;
    /** numbers of app workers, default to `os.cpus().length` */
    workers?: number;
    /** listening port, default to 7001(http) or 8443(https) */
    port?: number;
    /** https or not */
    https?: boolean;
    /** ssl key */
    key?: string;
    /** ssl cert */
    cert?: string;
    [prop: string]: any;
  }

  export function startCluster(options: ClusterOptions, callback: (...args: any[]) => any): void;

  export interface StartOptions {
    /** specify framework that can be absolute path or npm package */
    framework?: string;
    /** directory of application, default to `process.cwd()` */
    baseDir?: string;
    /** ignore single process mode warning */
    ignoreWarning?: boolean;
  }

  export function start(options?: StartOptions): Promise<Application>

  /**
   * Powerful Partial, Support adding ? modifier to a mapped property in deep level
   * @example
   * import { PowerPartial, EggAppConfig } from 'egg';
   *
   * // { view: { defaultEngines: string } } => { view?: { defaultEngines?: string } }
   * type EggConfig = PowerPartial<EggAppConfig>
   */
  export type PowerPartial<T> = {
    [U in keyof T]?: T[U] extends object
    ? PowerPartial<T[U]>
    : T[U]
  };

  // send data can be number|string|boolean|object but not Set|Map
  export interface Messenger extends EventEmitter {
    /**
     * broadcast to all agent/app processes including itself
     */
    broadcast(action: string, data: any): void;

    /**
     * send to agent from the app,
     * send to an random app from the agent
     */
    sendRandom(action: string, data: any): void;

    /**
     * send to specified process
     */
    sendTo(pid: number, action: string, data: any): void;

    /**
     * send to agent from the app,
     * send to itself from the agent
     */
    sendToAgent(action: string, data: any): void;

    /**
     * send to all app including itself from the app,
     * send to all app from the agent
     */
    sendToApp(action: string, data: any): void;
  }

  // compatible
  export interface EggLoaderOptions extends CoreLoaderOptions { }
  export interface EggLoader extends CoreLoader { }

  /**
   * App worker process Loader, will load plugins
   * @see https://github.com/eggjs/egg-core
   */
  export class AppWorkerLoader extends CoreLoader {
    loadConfig(): void;
    load(): void;
  }

  /**
   * Agent worker process loader
   * @see https://github.com/eggjs/egg-loader
   */
  export class AgentWorkerLoader extends CoreLoader {
    loadConfig(): void;
    load(): void;
  }

  export interface IBoot {
    /**
     * Ready to call configDidLoad,
     * Config, plugin files are referred,
     * this is the last chance to modify the config.
     */
    configWillLoad?(): void;

    /**
     * Config, plugin files have loaded
     */
    configDidLoad?(): void;

    /**
     * All files have loaded, start plugin here
     */
    didLoad?(): Promise<void>;

    /**
     * All plugins have started, can do some thing before app ready
     */
    willReady?(): Promise<void>;

    /**
     * Worker is ready, can do some things,
     * don't need to block the app boot
     */
    didReady?(): Promise<void>;

    /**
     * Server is listening
     */
    serverDidReady?(): Promise<void>;

    /**
     * Do some thing before app close
     */
    beforeClose?(): Promise<void>;
  }

  export interface Singleton<T> {
    get(id: string): T;
  }
}
