/* eslint-disable prefer-spread */
import assert from 'node:assert';
import { debuglog } from 'node:util';

import {
  Application as KoaApplication,
  Context as KoaContext,
  Request as KoaRequest,
  Response as KoaResponse,
  type MiddlewareFunc as KoaMiddlewareFunc,
  type Next,
} from '@eggjs/koa';
import { EggConsoleLogger, type Logger } from 'egg-logger';
import {
  EggRouter as Router,
  type RegisterOptions,
  type ResourcesController,
} from '@eggjs/router';
import type { ReadyFunctionArg } from 'get-ready';

import { BaseContextClass } from './base_context_class.js';
import { Timing } from './utils/timing.js';
import { Lifecycle } from './lifecycle.js';
import { EggLoader } from './loader/egg_loader.js';
import utils, { type Fun } from './utils/index.js';
import type { EggAppConfig } from './types.js';
import {
  Singleton,
  type SingletonCreateMethod,
  type SingletonOptions,
} from './singleton.js';

const debug = debuglog('@eggjs/core/egg');

export const EGG_LOADER = Symbol.for('egg#loader');

export interface EggCoreOptions {
  baseDir: string;
  type: 'application' | 'agent';
  plugins?: any;
  serverScope?: string;
  env?: string;
}

export type EggCoreInitOptions = Partial<EggCoreOptions>;

// export @eggjs/koa classes
export { KoaRequest, KoaResponse, KoaContext, KoaApplication, Router };

// export @eggjs/koa types
export type { Next, KoaMiddlewareFunc };

// export @eggjs/core classes
export class Request extends KoaRequest {
  declare app: EggCore;
  declare response: Response;
}

export class Response extends KoaResponse {
  declare app: EggCore;
  declare request: Request;
}

export class Context extends KoaContext {
  declare app: EggCore;
  declare request: Request;
  declare response: Response;
  declare service: BaseContextClass;

  // #region router

  /**
   * Returns map of URL parameters for given `path` and `paramNames`.
   * @example
   * ##### ctx.params.id {string}
   *
   * `GET /api/users/1` => `'1'`
   *
   * ##### ctx.params.per_page {string}
   *
   * The number of every page, `GET /api/users?per_page=20` => `20`
   */
  params?: Record<string, string>;
  /**
   * Returns array of router regexp url path captures.
   */
  captures?: string[];
  /**
   * Returns the name of the matched router.
   */
  routerName?: string;
  /**
   * Returns the path of the matched router.
   */
  routerPath?: string | RegExp;

  // #endregion
}

// export @eggjs/core types
export type MiddlewareFunc<T extends KoaContext = Context> =
  KoaMiddlewareFunc<T>;

export class EggCore extends KoaApplication {
  options: EggCoreOptions;
  timing: Timing;
  console: EggConsoleLogger;
  BaseContextClass: typeof BaseContextClass;
  Controller: typeof BaseContextClass;
  Service: typeof BaseContextClass;
  Helper?: typeof BaseContextClass;
  lifecycle: Lifecycle;
  loader: EggLoader;
  #closePromise?: Promise<void>;
  #router?: Router;

  /** auto inject on loadService() */

  readonly serviceClasses: Record<string, any> = {};
  /** auto inject on loadController() */

  readonly controller: Record<string, any> = {};
  /** auto inject on loadMiddleware() */
  readonly middlewares: Record<
    string,
    (opt: unknown, app: EggCore) => MiddlewareFunc
  > = {};

  /**
   * @class
   * @param {Object} options - options
   * @param {String} [options.baseDir] - the directory of application
   * @param {String} [options.type] - whether it's running in app worker or agent worker
   * @param {Object} [options.plugins] - custom plugins
   * @since 1.0.0
   */
  constructor(options: EggCoreInitOptions = {}) {
    options.baseDir = options.baseDir ?? process.cwd();
    options.type = options.type ?? 'application';
    assert(
      typeof options.baseDir === 'string',
      'options.baseDir required, and must be a string'
    );
    // assert(fs.existsSync(options.baseDir), `Directory ${options.baseDir} not exists`);
    // assert(fs.statSync(options.baseDir).isDirectory(), `Directory ${options.baseDir} is not a directory`);
    assert(
      options.type === 'application' || options.type === 'agent',
      'options.type should be application or agent'
    );
    super();

    this.timing = new Timing();
    /**
     * @member {Object} EggCore#options
     * @private
     * @since 1.0.0
     */
    this.options = options as EggCoreOptions;

    /**
     * logging for EggCore, avoid using console directly
     * @member {Logger} EggCore#console
     * @private
     * @since 1.0.0
     */
    this.console = new EggConsoleLogger();

    /**
     * @member {BaseContextClass} EggCore#BaseContextClass
     * @since 1.0.0
     */
    this.BaseContextClass = BaseContextClass;

    /**
     * Base controller to be extended by controller in `app.controller`
     * @class Controller
     * @augments BaseContextClass
     * @example
     * class UserController extends app.Controller {}
     */
    const Controller = this.BaseContextClass;

    /**
     * Retrieve base controller
     * @member {Controller} EggCore#Controller
     * @since 1.0.0
     */
    this.Controller = Controller;

    /**
     * Base service to be extended by services in `app.service`
     * @class Service
     * @augments BaseContextClass
     * @example
     * class UserService extends app.Service {}
     */
    const Service = this.BaseContextClass;

    /**
     * Retrieve base service
     * @member {Service} EggCore#Service
     * @since 1.0.0
     */
    this.Service = Service;

    this.lifecycle = new Lifecycle({
      baseDir: options.baseDir,
      app: this,
      logger: this.console,
    });
    this.lifecycle.on('error', err => this.emit('error', err));
    this.lifecycle.on('ready_timeout', id => this.emit('ready_timeout', id));
    this.lifecycle.on('ready_stat', data => this.emit('ready_stat', data));

    /**
     * The loader instance, the default class is {@link EggLoader}.
     * If you want define
     * @member {EggLoader} EggCore#loader
     * @since 1.0.0
     */
    const Loader = this[EGG_LOADER];
    assert(Loader, "Symbol.for('egg#loader') is required");
    this.loader = new Loader({
      baseDir: options.baseDir,
      app: this,
      plugins: options.plugins,
      logger: this.console,
      serverScope: options.serverScope,
      env: options.env ?? '',
      EggCoreClass: EggCore,
    });
  }

  get logger(): Logger {
    return this.console;
  }

  get coreLogger(): Logger {
    return this.console;
  }

  /**
   * create a singleton instance
   * @param {String} name - unique name for singleton
   * @param {Function|AsyncFunction} create - method will be invoked when singleton instance create
   */
  addSingleton(name: string, create: SingletonCreateMethod) {
    const options: SingletonOptions = {
      name,
      create,
      app: this,
    };
    const singleton = new Singleton(options);
    const initPromise = singleton.init();
    if (initPromise) {
      this.lifecycle.registerBeforeStart(async () => {
        await initPromise;
      }, `${name}-singleton-init`);
    }
  }

  /**
   * override koa's app.use, support generator function
   * @since 1.0.0
   */
  use<T extends KoaContext = Context>(fn: MiddlewareFunc<T>) {
    assert(typeof fn === 'function', 'app.use() requires a function');
    debug('[use] add middleware: %o', fn._name || fn.name || '-');
    this.middleware.push(fn as unknown as KoaMiddlewareFunc);
    return this;
  }

  /**
   * Whether `application` or `agent`
   * @member {String}
   * @since 1.0.0
   */
  get type() {
    return this.options.type;
  }

  /**
   * The current directory of application
   * @member {String}
   * @see {@link AppInfo#baseDir}
   * @since 1.0.0
   */
  get baseDir() {
    return this.options.baseDir;
  }

  /**
   * Alias to {@link https://npmjs.com/package/depd}
   * @member {Function}
   * @since 1.0.0
   */
  get deprecate() {
    return utils.deprecated;
  }

  /**
   * The name of application
   * @member {String}
   * @see {@link AppInfo#name}
   * @since 1.0.0
   */
  get name() {
    return this.loader ? this.loader.pkg.name : '';
  }

  /**
   * Retrieve enabled plugins
   * @member {Object}
   * @since 1.0.0
   */
  get plugins() {
    return this.loader ? this.loader.plugins : {};
  }

  /**
   * The configuration of application
   * @member {Config}
   * @since 1.0.0
   */
  get config(): EggAppConfig {
    return this.loader ? this.loader.config : ({} as EggAppConfig);
  }

  /**
   * Execute scope after loaded and before app start.
   *
   * Notice:
   * This method is now NOT recommended and regarded as a deprecated one,
   * For plugin development, we should use `didLoad` instead.
   * For application development, we should use `willReady` instead.
   *
   * @see https://eggjs.org/en/advanced/loader.html#beforestart
   *
   * @param  {Function} scope function will execute before app start
   * @param {string} [name] scope name, default is empty string
   */
  beforeStart(scope: Fun, name?: string) {
    this.deprecate(
      '`beforeStart` was deprecated, please use "Life Cycles" instead, see https://www.eggjs.org/advanced/loader#life-cycles'
    );
    this.lifecycle.registerBeforeStart(scope, name ?? '');
  }

  /**
   * register an callback function that will be invoked when application is ready.
   * @see https://github.com/node-modules/get-ready
   * @since 1.0.0
   * @example
   * const app = new Application(...);
   * app.ready(err => {
   *   if (err) throw err;
   *   console.log('done');
   * });
   */
  ready(): Promise<void>;
  ready(flagOrFunction: ReadyFunctionArg): void;
  ready(flagOrFunction?: ReadyFunctionArg) {
    if (flagOrFunction === undefined) {
      return this.lifecycle.ready();
    }
    return this.lifecycle.ready(flagOrFunction);
  }

  /**
   * If a client starts asynchronously, you can register `readyCallback`,
   * then the application will wait for the callback to ready
   *
   * It will log when the callback is not invoked after 10s
   *
   * Recommend to use {@link EggCore#beforeStart}
   * @since 1.0.0
   *
   * @param {String} name - readyCallback task name
   * @param {object} opts -
   *   - {Number} [timeout=10000] - emit `ready_timeout` when it doesn't finish but reach the timeout
   *   - {Boolean} [isWeakDep=false] - whether it's a weak dependency
   * @returns {Function} - a callback
   * @example
   * const done = app.readyCallback('mysql');
   * mysql.ready(done);
   */
  readyCallback(name: string, opts: object) {
    this.deprecate(
      '`readyCallback` was deprecated, please use "Life Cycles" instead, see https://www.eggjs.org/advanced/loader#life-cycles'
    );
    return this.lifecycle.legacyReadyCallback(name, opts);
  }

  /**
   * Register a function that will be called when app close.
   *
   * Notice:
   * This method is now NOT recommended directly used,
   * Developers SHOULDN'T use app.beforeClose directly now,
   * but in the form of class to implement beforeClose instead.
   *
   * @see https://eggjs.org/en/advanced/loader.html#beforeclose
   *
   * @param {Function} fn - the function that can be generator function or async function.
   */
  beforeClose(fn: Fun, name?: string) {
    this.deprecate(
      '`beforeClose` was deprecated, please use "Life Cycles" instead, see https://www.eggjs.org/advanced/loader#life-cycles'
    );
    this.lifecycle.registerBeforeClose(fn, name);
  }

  /**
   * Close all, it will close
   * - callbacks registered by beforeClose
   * - emit `close` event
   * - remove add listeners
   *
   * If error is thrown when it's closing, the promise will reject.
   * It will also reject after following call.
   * @returns {Promise} promise
   * @since 1.0.0
   */
  async close(): Promise<void> {
    if (this.#closePromise) return this.#closePromise;
    this.#closePromise = this.lifecycle.close();
    return this.#closePromise;
  }

  /**
   * get router
   * @member {Router} EggCore#router
   * @since 1.0.0
   */
  get router() {
    if (this.#router) {
      return this.#router;
    }
    this.#router = new Router({ sensitive: true }, this);
    return this.#router;
  }

  /**
   * Alias to {@link Router#url}
   * @param {String} name - Router name
   * @param {Object} params - more parameters
   * @returns {String} url
   */
  url(name: string, params?: Parameters<Router['url']>[1]): string {
    return this.router.url(name, params);
  }

  // delegate all router method to application
  // 'head', 'options', 'get', 'put', 'patch', 'post', 'delete'
  // 'all', 'resources', 'register', 'redirect'
  head(
    path: string | RegExp | (string | RegExp)[],
    ...middlewares: (MiddlewareFunc | string)[]
  ): EggCore;
  head(
    name: string,
    path: string | RegExp | (string | RegExp)[],
    ...middlewares: (MiddlewareFunc | string)[]
  ): EggCore;

  head(...args: any): EggCore {
    this.router.head.apply(this.router, args);
    return this;
  }
  // options(path: string | RegExp | (string | RegExp)[], ...middlewares: (MiddlewareFunc | string)[]): EggCore;
  // options(name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: (MiddlewareFunc | string)[]): EggCore;
  // options(...args: any): EggCore {
  //   this.router.options.apply(this.router, args);
  //   return this;
  // }
  get(
    path: string | RegExp | (string | RegExp)[],
    ...middlewares: (MiddlewareFunc | string)[]
  ): EggCore;
  get(
    name: string,
    path: string | RegExp | (string | RegExp)[],
    ...middlewares: (MiddlewareFunc | string)[]
  ): EggCore;

  get(...args: any): EggCore {
    this.router.get.apply(this.router, args);
    return this;
  }
  put(
    path: string | RegExp | (string | RegExp)[],
    ...middlewares: (MiddlewareFunc | string)[]
  ): EggCore;
  put(
    name: string,
    path: string | RegExp | (string | RegExp)[],
    ...middlewares: (MiddlewareFunc | string)[]
  ): EggCore;

  put(...args: any): EggCore {
    this.router.put.apply(this.router, args);
    return this;
  }
  patch(
    path: string | RegExp | (string | RegExp)[],
    ...middlewares: (MiddlewareFunc | string)[]
  ): EggCore;
  patch(
    name: string,
    path: string | RegExp | (string | RegExp)[],
    ...middlewares: (MiddlewareFunc | string)[]
  ): EggCore;

  patch(...args: any): EggCore {
    this.router.patch.apply(this.router, args);
    return this;
  }
  post(
    path: string | RegExp | (string | RegExp)[],
    ...middlewares: (MiddlewareFunc | string)[]
  ): EggCore;
  post(
    name: string,
    path: string | RegExp | (string | RegExp)[],
    ...middlewares: (MiddlewareFunc | string)[]
  ): EggCore;

  post(...args: any): EggCore {
    this.router.post.apply(this.router, args);
    return this;
  }
  delete(
    path: string | RegExp | (string | RegExp)[],
    ...middlewares: (MiddlewareFunc | string)[]
  ): EggCore;
  delete(
    name: string,
    path: string | RegExp | (string | RegExp)[],
    ...middlewares: (MiddlewareFunc | string)[]
  ): EggCore;

  delete(...args: any): EggCore {
    this.router.delete.apply(this.router, args);
    return this;
  }
  del(
    path: string | RegExp | (string | RegExp)[],
    ...middlewares: (MiddlewareFunc | string)[]
  ): EggCore;
  del(
    name: string,
    path: string | RegExp | (string | RegExp)[],
    ...middlewares: (MiddlewareFunc | string)[]
  ): EggCore;

  del(...args: any): EggCore {
    this.router.del.apply(this.router, args);
    return this;
  }

  all(
    path: string | RegExp | (string | RegExp)[],
    ...middlewares: (MiddlewareFunc | string)[]
  ): EggCore;
  all(
    name: string,
    path: string | RegExp | (string | RegExp)[],
    ...middlewares: (MiddlewareFunc | string)[]
  ): EggCore;

  all(...args: any): EggCore {
    this.router.all.apply(this.router, args);
    return this;
  }

  resources(prefix: string, controller: string | ResourcesController): EggCore;
  resources(
    prefix: string,
    middleware: MiddlewareFunc,
    controller: string | ResourcesController
  ): EggCore;
  resources(
    name: string,
    prefix: string,
    controller: string | ResourcesController
  ): EggCore;
  resources(
    name: string,
    prefix: string,
    middleware: MiddlewareFunc,
    controller: string | ResourcesController
  ): EggCore;

  resources(...args: any): EggCore {
    this.router.resources.apply(this.router, args);
    return this;
  }

  redirect(source: string, destination: string, status = 301) {
    this.router.redirect(source, destination, status);
    return this;
  }

  register(
    path: string | RegExp | (string | RegExp)[],
    methods: string[],
    middleware: MiddlewareFunc | MiddlewareFunc[],
    opts?: RegisterOptions
  ) {
    this.router.register(path, methods, middleware, opts);
    return this;
  }

  get [EGG_LOADER]() {
    return EggLoader;
  }
}
