'use strict';

const { performance } = require('perf_hooks');
const delegate = require('delegates');
const { assign } = require('utility');
const eggUtils = require('egg-core').utils;

const HELPER = Symbol('Context#helper');
const LOCALS = Symbol('Context#locals');
const LOCALS_LIST = Symbol('Context#localsList');
const COOKIES = Symbol('Context#cookies');
const CONTEXT_LOGGERS = Symbol('Context#logger');
const CONTEXT_HTTPCLIENT = Symbol('Context#httpclient');
const CONTEXT_ROUTER = Symbol('Context#router');

const proto = module.exports = {

  /**
   * Get the current visitor's cookies.
   */
  get cookies() {
    if (!this[COOKIES]) {
      this[COOKIES] = new this.app.ContextCookies(this, this.app.keys, this.app.config.cookies);
    }
    return this[COOKIES];
  },

  /**
   * Get a wrapper httpclient instance contain ctx in the hold request process
   *
   * @return {ContextHttpClient} the wrapper httpclient instance
   */
  get httpclient() {
    if (!this[CONTEXT_HTTPCLIENT]) {
      this[CONTEXT_HTTPCLIENT] = new this.app.ContextHttpClient(this);
    }
    return this[CONTEXT_HTTPCLIENT];
  },

  /**
   * Shortcut for httpclient.curl
   *
   * @function Context#curl
   * @param {String|Object} url - request url address.
   * @param {Object} [options] - options for request.
   * @return {Object} see {@link ContextHttpClient#curl}
   */
  curl(url, options) {
    return this.httpclient.curl(url, options);
  },

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
  get router() {
    if (!this[CONTEXT_ROUTER]) {
      this[CONTEXT_ROUTER] = this.app.router;
    }
    return this[CONTEXT_ROUTER];
  },

  /**
   * Set router to Context, only use on EggRouter
   * @param {EggRouter} val router instance
   */
  set router(val) {
    this[CONTEXT_ROUTER] = val;
  },

  /**
   * Get helper instance from {@link Application#Helper}
   *
   * @member {Helper} Context#helper
   * @since 1.0.0
   */
  get helper() {
    if (!this[HELPER]) {
      this[HELPER] = new this.app.Helper(this);
    }
    return this[HELPER];
  },

  /**
   * Wrap app.loggers with context infomation,
   * if a custom logger is defined by naming aLogger, then you can `ctx.getLogger('aLogger')`
   *
   * @param {String} name - logger name
   * @return {Logger} logger
   */
  getLogger(name) {
    if (this.app.config.logger.enableFastContextLogger) {
      return this.app.getLogger(name);
    }
    let cache = this[CONTEXT_LOGGERS];
    if (!cache) {
      cache = this[CONTEXT_LOGGERS] = {};
    }

    // read from cache
    if (cache[name]) return cache[name];

    // get no exist logger
    const appLogger = this.app.getLogger(name);
    if (!appLogger) return null;

    // write to cache
    cache[name] = new this.app.ContextLogger(this, appLogger);
    return cache[name];
  },

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
  get logger() {
    return this.getLogger('logger');
  },

  /**
   * Logger for frameworks and plugins,
   * wrapping app.coreLogger with context infomation
   *
   * @member {ContextLogger} Context#coreLogger
   * @since 1.0.0
   */
  get coreLogger() {
    return this.getLogger('coreLogger');
  },

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
    if (this[LOCALS_LIST] && this[LOCALS_LIST].length) {
      assign(this[LOCALS], this[LOCALS_LIST]);
      this[LOCALS_LIST] = null;
    }
    return this[LOCALS];
  },

  set locals(val) {
    if (!this[LOCALS_LIST]) {
      this[LOCALS_LIST] = [];
    }
    this[LOCALS_LIST].push(val);
  },

  /**
   * alias to {@link Context#locals}, compatible with koa that use this variable
   * @member {Object} state
   * @see Context#locals
   */
  get state() {
    return this.locals;
  },

  set state(val) {
    this.locals = val;
  },

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
  runInBackground(scope) {
    // try to use custom function name first
    /* istanbul ignore next */
    const taskName = scope._name || scope.name || eggUtils.getCalleeFromStack(true);
    scope._name = taskName;
    this._runInBackground(scope);
  },

  // let plugins or frameworks to reuse _runInBackground in some cases.
  // e.g.: https://github.com/eggjs/egg-mock/pull/78
  _runInBackground(scope) {
    const ctx = this;
    const start = performance.now();
    /* istanbul ignore next */
    const taskName = scope._name || scope.name || eggUtils.getCalleeFromStack(true);
    // use setImmediate to ensure all sync logic will run async
    return new Promise(resolve => setImmediate(resolve))
      // use app.toAsyncFunction to support both generator function and async function
      .then(() => ctx.app.toAsyncFunction(scope)(ctx))
      .then(() => {
        ctx.coreLogger.info('[egg:background] task:%s success (%dms)',
          taskName, Math.floor((performance.now() - start) * 1000) / 1000);
      })
      .catch(err => {
        // background task process log
        ctx.coreLogger.info('[egg:background] task:%s fail (%dms)',
          taskName, Math.floor((performance.now() - start) * 1000) / 1000);

        // emit error when promise catch, and set err.runInBackground flag
        err.runInBackground = true;
        ctx.app.emit('error', err, ctx);
      });
  },
};

/**
 * Context delegation.
 */

delegate(proto, 'request')
  /**
   * @member {Boolean} Context#acceptJSON
   * @see Request#acceptJSON
   * @since 1.0.0
   */
  .getter('acceptJSON')
  /**
   * @member {Array} Context#queries
   * @see Request#queries
   * @since 1.0.0
   */
  .getter('queries')
  /**
   * @member {Boolean} Context#accept
   * @see Request#accept
   * @since 1.0.0
   */
  .getter('accept')
  /**
   * @member {string} Context#ip
   * @see Request#ip
   * @since 1.0.0
   */
  .access('ip');

delegate(proto, 'response')
  /**
   * @member {Number} Context#realStatus
   * @see Response#realStatus
   * @since 1.0.0
   */
  .access('realStatus');
