'use strict';

const delegate = require('delegates');
const ContextLogger = require('egg-logger').EggContextLogger;
const Cookies = require('egg-cookies');
const co = require('co');
const ContextHttpClient = require('../../lib/core/context_httpclient');
const util = require('../../lib/core/util');

const HELPER = Symbol('Context#helper');
const VIEW = Symbol('Context#view');
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
   * 默认的 role 检测失败处理
   * session 插件等可以覆盖 ctx.roleFailureHandler(action) 来重置
   * @method Context#roleFailureHandler
   * @param  {String} action 导致失败的角色
   */
  roleFailureHandler(action) {
    const message = `Forbidden, required role: ${action}`;
    this.status = 403;
    if (this.isAjax) {
      this.body = {
        message,
        stat: 'deny',
      };
    } else {
      this.body = message;
    }
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
  * curl(url, options) {
    return yield this.httpclient.curl(url, options);
  },

  /**
   * App 的 {@link Router} 实例，你可以用它生成 URL Path, 比如 `{@link Router#pathFor|router.pathFor}`
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
   * 用于记录 egg Request 周期的耗时，比如总耗时, View 渲染耗时
   *
   * 如果你有自定义的访问，希望往 RequestLog 里面增加统计信息，可以往 ctx.runtime['xx'] 里面写信息
   * egg 会自动将它们打印出来。
   * @member {Object} Context#runtime
   * @property {Float} rt - 总耗时
   * @property {Float} view - View Render 耗时
   * @property {Float} buc - Buc 查询耗时
   * @property {Float} mysql - MySQL 查询耗时
   * @property {Float} hsf - HSF 查询耗时
   * @property {Float} tr - TR 查询耗时
   * @property {Float} http - 外部 HTTP 请求耗时
   * @since 1.0.0
   */
  get runtime() {
    this._runtime = this._runtime || {};
    return this._runtime;
  },

  /**
   * 记录上下文相关的操作时间
   * @param  {String} event 与 {@link Application#instrument} 一致
   * @param  {String} action 与 {@link Application#instrument} 一致
   * @return {Object} 与 {@link Application#instrument} 一致
   */
  instrument(event, action) {
    return this.app.instrument(event, action, this);
  },

  /**
   * 获取 helper 实例
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
   * 默认返回一个空对象，需要实现这个接口
   *
   * 插件需要实现一个内部约定 getter: `_tracer`
   * @member {Object} Context#tracer
   */
  get tracer() {
    return this._tracer || {};
  },

  /**
   * Wrap app.loggers with context infomation,
   * if a custom logger is defined by naming aLogger, then you can `ctx.getLogger('aLogger')`
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
   * @member {ContextLogger} Context#coreLogger
   * @since 1.0.0
   */
  get coreLogger() {
    return this.getLogger('coreLogger');
  },

  /**
   * 获取 view 实例
   * @return {View} view 实例
   */
  get view() {
    if (!this[VIEW]) {
      this[VIEW] = new this.app.View(this);
    }
    return this[VIEW];
  },

  /**
   * 渲染页面模板后直接返回 response
   * @method Context#render
   * @param {String} name 模板文件名
   * @param {Object} [locals] 需要放到页面上的变量
   * @see Context#renderView
   */
  * render(name, locals) {
    this.body = yield this.renderView(name, locals);
  },

  /**
   * 渲染页面模板，返回字符串
   * @method Context#renderView
   * @param {String} name 模板文件名
   * @param {Object} [locals] 需要放到页面上的变量
   * @return {String} 渲染后的字符串.
   * @see View#render
   */
  * renderView(name, locals) {
    const ins = this.instrument('view', `render ${name}`);
    const body = yield this.view.render(name, locals);
    ins.end();
    return body;
  },

  /**
   * 渲染模板字符串
   * @method Context#renderString
   * @param {String} tpl 模板字符串
   * @param {Object} [locals] 需要放到页面上的变量
   * @return {String} 渲染后的字符串
   * @see View#renderString
   */
  * renderString(tpl, locals) {
    return yield this.view.renderString(tpl, locals);
  },

  /**
   * locals 为模板使用的变量，可以在任何地方设置 locals，在渲染模板的时候会合并这些变量。
   * app.locals 和 this.locals 最大的区别是作用域不同，app.locals 是全局的，this.locals 是一个请求的。
   *
   * 设置 locals 的时候只支持对象，他会和原来的数据进行合并
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
   * 注意：**this.locals 有缓存，只在第一次访问 this.locals 时合并 app.locals。**
   *
   * @member {Object} Context#locals
   */
  get locals() {
    if (!this[LOCALS]) {
      this[LOCALS] = util.assign({}, this.app.locals);
    }
    if (this[LOCALS_LIST] && this[LOCALS_LIST].length) {
      util.assign(this[LOCALS], this[LOCALS_LIST]);
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
   * egg 使用 locals 作为服务端传递给模板中的变量挂载容器
   * 当开启 egg-locals 插件时，this.state 返回 this.locals
   * @member {Object} state
   */
  get state() {
    return this.locals || {};
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

/**
 * @member {Boolean} Context#isAjax
 * @see Request#isAjax
 * @since 1.0.0
 */

/**
 * @member {Array} Context#queries
 * @see Request#queries
 * @since 1.0.0
 */

/**
 * @member {Void} Context#jsonp
 * @see Response#jsonp
 * @since 1.0.0
 */

/**
 * @member {Number} Context#realStatus
 * @see Response#realStatus
 * @since 1.0.0
 */

delegate(proto, 'request')
  .getter('isAjax')
  .getter('acceptJSON')
  .getter('queries')
  .getter('accept')
  .access('ip');

delegate(proto, 'response')
  .setter('jsonp')
  .access('realStatus');
