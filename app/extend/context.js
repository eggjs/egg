'use strict';

const delegate = require('delegates');
const ContextLogger = require('egg-logger').EggContextLogger;
const Cookies = require('egg-cookies');
const co = require('co');
const ContextHttpClient = require('../../lib/core/context_httpclient');
const utility = require('utility');


const HELPER = Symbol('Context#helper');
const LOCALS = Symbol('Context#locals');
const LOCALS_LIST = Symbol('Context#localsList');
const COOKIES = Symbol('Context#cookies');
const CONTEXT_LOGGERS = Symbol('Context#logger');
const CONTEXT_HTTPCLIENT = Symbol('Context#httpclient');

const proto = module.exports = {
  get cookies() {
    if (!this[COOKIES]) {
      this[COOKIES] = new Cookies(this, this.app.keys);
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
      this[CONTEXT_HTTPCLIENT] = new ContextHttpClient(this);
    }
    return this[CONTEXT_HTTPCLIENT];
  },

  /**
   * Shortcut for httpclient.curl
   *
   * @method Context#curl
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
    return this.app.router;
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
    cache[name] = new ContextLogger(this, appLogger);
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
      this[LOCALS] = Object.assign({}, this.app.locals);
    }
    if (this[LOCALS_LIST] && this[LOCALS_LIST].length) {
      utility.assign(this[LOCALS], this[LOCALS_LIST]);
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
   * Run generator function in the background
   * @param  {Generator} scope - generator function, the first args is ctx
   * ```js
   * this.body = 'hi';
   *
   * this.runInBackground(function* saveUserInfo(ctx) {
   *   yield ctx.mysql.query(sql);
   *   yield ctx.curl(url);
   * });
   * ```
   */
  runInBackground(scope) {
    const ctx = this;
    const start = Date.now();
    /* istanbul ignore next */
    const taskName = scope.name || '-';
    co(function* () {
      yield scope(ctx);
      ctx.coreLogger.info('[egg:background] task:%s success (%dms)', taskName, Date.now() - start);
    }).catch(err => {
      ctx.coreLogger.info('[egg:background] task:%s fail (%dms)', taskName, Date.now() - start);
      ctx.coreLogger.error(err);
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
   * @member {Void} Context#jsonp
   * @see Response#jsonp
   * @since 1.0.0
   */
  .setter('jsonp')
  /**
   * @member {Number} Context#realStatus
   * @see Response#realStatus
   * @since 1.0.0
   */
  .access('realStatus');
