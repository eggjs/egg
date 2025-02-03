import type { Socket } from 'node:net';
import type {
  RequestOptions as HttpClientRequestOptions,
} from 'urllib';
import type {
  EggLoggerOptions, EggLoggersOptions,
} from 'egg-logger';
import type {
  FileLoaderOptions,
  EggAppConfig as EggCoreAppConfig,
} from '@eggjs/core';
import type {
  EggApplicationCore, Context,
} from './egg.js';
import type { MetaMiddlewareOptions } from '../app/middleware/meta.js';
import type { NotFoundMiddlewareOptions } from '../app/middleware/notfound.js';
import type { SiteFileMiddlewareOptions } from '../app/middleware/site_file.js';

// import plugins types
import '@eggjs/watcher';
import '@eggjs/development';
import '@eggjs/jsonp';
import '@eggjs/i18n';
import '@eggjs/static';
import '@eggjs/security';
import '@eggjs/schedule';
import '@eggjs/session';
import '@eggjs/onerror';
import '@eggjs/logrotator';

export type {
  EggAppInfo,
} from '@eggjs/core';

type IgnoreItem = string | RegExp | ((ctx: Context) => boolean);
type IgnoreOrMatch = IgnoreItem | IgnoreItem[];

export interface ClientErrorResponse {
  body: string | Buffer;
  status: number;
  headers: { [key: string]: string };
}

/** egg env type */
export type EggEnvType = 'local' | 'unittest' | 'prod' | string;

/** logger config of egg */
export interface EggLoggerConfig extends Omit<EggLoggersOptions, 'type'> {
  /** custom config of coreLogger */
  coreLogger?: Partial<EggLoggerOptions>;
  /** allow debug log at prod, defaults to `false` */
  allowDebugAtProd?: boolean;
  /** disable logger console after app ready. defaults to `false` on local and unittest env, others is `true`. */
  disableConsoleAfterReady?: boolean;
  /** [deprecated] Defaults to `true`. */
  enablePerformanceTimer?: boolean;
  /** using the app logger instead of EggContextLogger, defaults to `false` */
  enableFastContextLogger?: boolean;
}

/** Custom Loader Configuration */
export interface CustomLoaderConfig extends Omit<FileLoaderOptions, 'inject' | 'target'> {
  /**
   * an object you wanner load to, value can only be 'ctx' or 'app'. default to app
   */
  inject?: 'ctx' | 'app';
  /**
   * whether need to load files in plugins or framework, default to false
   */
  loadunit?: boolean;
}

export interface HttpClientConfig {
  /** Request timeout */
  timeout?: number;
  /** Default request args for httpclient */
  request?: HttpClientRequestOptions;
  /**
   * @deprecated keep compatible with egg 3.x, no more used
   */
  useHttpClientNext?: boolean;
}

export interface EggAppConfig extends EggCoreAppConfig {
  workerStartTimeout: number;
  baseDir: string;
  middleware: string[];
  coreMiddleware: string[];

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
    ignore?: IgnoreOrMatch;
    match?: IgnoreOrMatch;
    enableTypes?: string[];
    extendTypes?: {
      json: string[];
      form: string[];
      text: string[];
    };
    /** Default is `'error'`, it will return `400` response when `Prototype-Poisoning` happen. */
    onProtoPoisoning: 'error' | 'remove' | 'ignore';
    onerror(err: any, ctx: Context): void;
  };

  /**
   * logger options
   * @member Config#logger
   * @property {String} dir - directory of log files
   * @property {String} encoding - log file encoding, defaults to utf8
   * @property {String} level - default log level, could be: DEBUG, INFO, WARN, ERROR or NONE, defaults to INFO in production
   * @property {String} consoleLevel - log level of stdout, defaults to `INFO` in local serverEnv, defaults to `WARN` in unittest, others is `NONE`
   * @property {Boolean} disableConsoleAfterReady - disable logger console after app ready. defaults to `false` on local and unittest env, others is `true`.
   * @property {Boolean} outputJSON - log as JSON or not, defaults to `false`
   * @property {Boolean} buffer - if enabled, flush logs to disk at a certain frequency to improve performance, defaults to true
   * @property {String} errorLogName - file name of errorLogger
   * @property {String} coreLogName - file name of coreLogger
   * @property {String} agentLogName - file name of agent worker log
   * @property {Object} coreLogger - custom config of coreLogger
   * @property {Boolean} allowDebugAtProd - allow debug log at prod, defaults to false
   * @property {Boolean} enableFastContextLogger - using the app logger instead of EggContextLogger, defaults to false
   */
  logger: Partial<EggLoggerConfig>;

  /** custom logger of egg */
  customLogger: {
    [key: string]: EggLoggerOptions;
  };

  /** Configuration of httpclient in egg. */
  httpclient: HttpClientConfig;

  /**
   * customLoader config
   */
  // customLoader: {
  //   [key: string]: CustomLoaderConfig;
  // };

  /**
   * It will ignore special keys when dumpConfig
   */
  dump: {
    ignore: Set<string | RegExp>;
    timing: {
      slowBootActionMinDuration: number;
    };
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
   * Detect request' ip from specified headers, not case-sensitive. Only worked when config.proxy set to true.
   */
  ipHeaders: string;

  protocolHeaders: string;
  maxProxyCount: number;
  maxIpsCount: number;
  proxy: boolean;
  cookies: {
    sameSite?: string;
    httpOnly?: boolean;
  };

  /**
   * The key that signing cookies. It can contain multiple keys separated by .
   */
  keys: string;

  /**
   * The name of the application
   */
  name: string;

  /**
   * package.json
   */
  pkg: Record<string, any>;

  rundir: string;

  siteFile: SiteFileMiddlewareOptions;
  meta: MetaMiddlewareOptions;
  notfound: NotFoundMiddlewareOptions;
  overrideMethod: {
    enable: boolean;
    allowedMethods: string[];
  };

  onClientError?(err: Error, socket: Socket, app: EggApplicationCore): ClientErrorResponse | Promise<ClientErrorResponse>;

  /**
   * server timeout in milliseconds, default to 0 (no timeout).
   *
   * for special request, just use `ctx.req.setTimeout(ms)`
   *
   * @see https://nodejs.org/api/http.html#http_server_timeout
   */
  serverTimeout: number | null;

  cluster: {
    listen: {
      path: string,
      port: number,
      hostname: string,
    };
  };

  clusterClient: {
    maxWaitTime: number;
    responseTimeout: number;
  };

  [prop: string]: any;
}

export type RequestObjectBody = Record<string, any>;

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

