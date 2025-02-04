import { assign } from 'utility';
import { now, diff } from 'performance-ms';
import {
  utils, Context as EggCoreContext, Router,
} from '@eggjs/core';
import type { Cookies as ContextCookies } from '@eggjs/cookies';
import type { EggLogger } from 'egg-logger';
import type { Application } from '../../lib/application.js';
import type {
  HttpClientRequestURL, HttpClientRequestOptions, HttpClient,
} from '../../lib/core/httpclient.js';
import type { BaseContextClass } from '../../lib//core/base_context_class.js';
import type Request from './request.js';
import type Response from './response.js';
import type Helper from './helper.js';

const HELPER = Symbol('ctx helper');
const LOCALS = Symbol('ctx locals');
const LOCALS_LIST = Symbol('ctx localsList');
const COOKIES = Symbol('ctx cookies');
const CONTEXT_HTTPCLIENT = Symbol('ctx httpclient');
const CONTEXT_ROUTER = Symbol('ctx router');

interface Cookies extends ContextCookies {
  request: any;
  response: any;
}

export default class Context extends EggCoreContext {
  declare app: Application;
  declare request: Request;
  declare response: Response;
  declare service: BaseContextClass;
  declare proxy: any;

  /**
   * Request start time
   * @member {Number} Context#starttime
   */
  starttime: number;
  /**
   * Request start timer using `performance.now()`
   * @member {Number} Context#performanceStarttime
   */
  performanceStarttime: number;

  /**
   * Get the current visitor's cookies.
   */
  get cookies() {
    let cookies = this[COOKIES];
    if (!cookies) {
      this[COOKIES] = cookies = new this.app.ContextCookies(this, this.app.keys, this.app.config.cookies);
    }
    return cookies as Cookies;
  }

  /**
   * Get a wrapper httpclient instance contain ctx in the hold request process
   *
   * @return {HttpClient} the wrapper httpclient instance
   */
  get httpclient(): HttpClient {
    if (!this[CONTEXT_HTTPCLIENT]) {
      this[CONTEXT_HTTPCLIENT] = new this.app.ContextHttpClient(this as any);
    }
    return this[CONTEXT_HTTPCLIENT] as HttpClient;
  }

  /**
   * Alias to {@link Context#httpclient}
   */
  get httpClient(): HttpClient {
    return this.httpclient;
  }

  /**
   * Shortcut for httpclient.curl
   *
   * @function Context#curl
   * @param {String|Object} url - request url address.
   * @param {Object} [options] - options for request.
   * @return {Object} see {@link ContextHttpClient#curl}
   */
  async curl(url: HttpClientRequestURL, options?: HttpClientRequestOptions): ReturnType<HttpClient['request']> {
    return await this.httpclient.curl(url, options);
  }

  /**
   * Alias to {@link Application#router}
   *
   * @member {Router} Context#router
   * @since 1.0.0
   * @example
   * ```js
   * this.router.pathFor('post', { id: 12 });
   * ```
   */
  get router(): Router {
    if (this[CONTEXT_ROUTER]) {
      return this[CONTEXT_ROUTER] as Router;
    }
    return this.app.router;
  }

  /**
   * Set router to Context, only use on EggRouter
   * @param {Router} val router instance
   */
  set router(val: Router) {
    this[CONTEXT_ROUTER] = val;
  }

  /**
   * Get helper instance from {@link Application#Helper}
   *
   * @member {Helper} Context#helper
   * @since 1.0.0
   */
  get helper(): Helper {
    if (!this[HELPER]) {
      this[HELPER] = new this.app.Helper(this as any);
    }
    return this[HELPER] as Helper;
  }

  /**
   * Wrap app.loggers with context information,
   * if a custom logger is defined by naming aLogger, then you can `ctx.getLogger('aLogger')`
   *
   * @param {String} name - logger name
   */
  getLogger(name: string): EggLogger {
    return this.app.getLogger(name);
  }

  /**
   * Logger for Application
   *
   * @member {Logger} Context#logger
   * @since 1.0.0
   * @example
   * ```js
   * this.logger.info('some request data: %j', this.request.body);
   * this.logger.warn('WARNING!!!!');
   * ```
   */
  get logger(): EggLogger {
    return this.getLogger('logger');
  }

  /**
   * Logger for frameworks and plugins
   *
   * @member {Logger} Context#coreLogger
   * @since 1.0.0
   */
  get coreLogger(): EggLogger {
    return this.getLogger('coreLogger');
  }

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
  get locals() {
    if (!this[LOCALS]) {
      this[LOCALS] = assign({}, this.app.locals);
    }
    if (Array.isArray(this[LOCALS_LIST]) && this[LOCALS_LIST].length > 0) {
      assign(this[LOCALS], this[LOCALS_LIST]);
      this[LOCALS_LIST] = null;
    }
    return this[LOCALS] as Record<string, any>;
  }

  set locals(val) {
    const localsList = this[LOCALS_LIST] as Record<string, any>[] ?? [];
    localsList.push(val);
    this[LOCALS_LIST] = localsList;
  }

  /**
   * alias to {@link Context#locals}, compatible with koa that use this variable
   * @member {Object} state
   * @see Context#locals
   */
  get state() {
    return this.locals;
  }

  set state(val) {
    this.locals = val;
  }

  /**
   * Run async function in the background
   * @param {Function} scope - the first args is ctx
   * ```js
   * this.body = 'hi';
   *
   * this.runInBackground(async ctx => {
   *   await ctx.mysql.query(sql);
   *   await ctx.curl(url);
   * });
   * ```
   */
  runInBackground(scope: (ctx: Context) => Promise<void>, taskName?: string): void {
    // try to use custom function name first
    if (!taskName) {
      taskName = Reflect.get(scope, '_name') || scope.name || utils.getCalleeFromStack(true);
    }
    // use setImmediate to ensure all sync logic will run async
    setImmediate(() => {
      this._runInBackground(scope, taskName!);
    });
  }

  // let plugins or frameworks to reuse _runInBackground in some cases.
  // e.g.: https://github.com/eggjs/egg-mock/pull/78
  async _runInBackground(scope: (ctx: Context) => Promise<void>, taskName: string) {
    const startTime = now();
    try {
      await scope(this as any);
      this.coreLogger.info('[egg:background] task:%s success (%dms)', taskName, diff(startTime));
    } catch (err: any) {
      // background task process log
      this.coreLogger.info('[egg:background] task:%s fail (%dms)', taskName, diff(startTime));

      // emit error when promise catch, and set err.runInBackground flag
      err.runInBackground = true;
      this.app.emit('error', err, this);
    }
  }

  /**
   * @member {Boolean} Context#acceptJSON
   * @see Request#acceptJSON
   * @since 1.0.0
   */
  get acceptJSON(): boolean {
    return this.request.acceptJSON;
  }

  get query(): Record<string, string> {
    return this.request.query;
  }

  /**
   * @member {Array} Context#queries
   * @see Request#queries
   * @since 1.0.0
   */
  get queries(): Record<string, string[]> {
    return this.request.queries;
  }

  /**
   * @member {string} Context#ip
   * @see Request#ip
   * @since 1.0.0
   */
  get ip(): string {
    return this.request.ip;
  }

  set ip(val: string) {
    this.request.ip = val;
  }

  /**
   * @member {Number} Context#realStatus
   * @see Response#realStatus
   * @since 1.0.0
   */
  get realStatus(): number {
    return this.response.realStatus;
  }

  set realStatus(val: number) {
    this.response.realStatus = val;
  }
}

declare module '@eggjs/core' {
  // add Context overrides types
  interface Context {
    proxy: any;
    performanceStarttime: number;
    starttime: number;
    runInBackground(scope: (ctx: Context) => Promise<void>, taskName?: string): void;
    _runInBackground(scope: (ctx: Context) => Promise<void>, taskName: string): void;
    get acceptJSON(): boolean;
    get query(): Record<string, string>;
    get queries(): Record<string, string[]>;
    curl(url: HttpClientRequestURL, options?: HttpClientRequestOptions): ReturnType<HttpClient['request']>;
    get router(): Router;
    set router(val: Router);
    get helper(): Helper;
    get httpclient(): HttpClient;
    get httpClient(): HttpClient;
    getLogger(name: string): EggLogger;
    get logger(): EggLogger;
    get coreLogger(): EggLogger;
    get locals(): Record<string, any>;
    get realStatus(): number;
    set realStatus(val: number);
  }
}
