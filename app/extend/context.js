'use strict';

const delegate = require('delegates');
const jsonpBody = require('jsonp-body');
const ContextLogger = require('egg-logger').EggContextLogger;
const Cookies = require('egg-cookies');
const co = require('co');
const util = require('../../lib/core/util');

const LOGGER = Symbol('LOGGER');
const CORE_LOGGER = Symbol('CORE_LOGGER');
const HELPER = Symbol('Context#helper');
const VIEW = Symbol('Context#view');
const LOCALS = Symbol('Context#locals');
const LOCALS_LIST = Symbol('Context#localsList');
const COOKIES = Symbol('Context#cookies');

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
   * 对 {@link urllib} 的封装，会自动记录调用日志，参数跟 `urllib.request(url, args)` 保持一致.
   * @method Context#curl
   * @param {String} url request url address.
   * @param {Object} opts options for request, Optional.
   * @return {Object} 与 {@link Application#curl} 一致
   * @since 1.0.0
   */
  * curl(url, opts) {
    opts = opts || {};
    opts.ctx = this;
    const method = (opts.method || 'GET').toUpperCase();
    const ins = this.instrument('http', `${method} ${url}`);
    const result = yield this.app.curl(url, opts);
    ins.end();
    return result;
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
   * 读/写真实的响应状态码，在一些特殊场景，如 404，500 状态，我们希望通过 302 跳转到统一的 404 和 500 页面， 但是日志里面又想正确地记录 404 或 500 真实的状态码而不是 302，那么我们就需要设置 realStatus 来实现了。
   * @member {Number} Context#realStatus
   */
  get realStatus() {
    if (this._realStatus) {
      return this._realStatus;
    }
    return this.status;
  },

  set realStatus(status) {
    this._realStatus = status;
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
   * 写 Cookie
   * @method Cookie#setCookie
   * @param {String} name  cookie name
   * @param {String} value cookie value
   * @param {Object} opts  cookie options
   * - {String}  domain    cookie domain, default is `ctx.hostname`
   * - {String}  path      cookie path, default is '/'
   * - {Boolean} encrypt   encrypt cookie or not, default is false
   * - {Boolean} httpOnly  http only cookie or not, default is true
   * - {Date}    expires   cookie's expiration date, default is expires at the end of session.
   * @return {Context} koa context
   */
  setCookie(name, value, opts) {
    this.cookies.set(name, value, opts);
    return this;
  },

  /**
   * 读取 Cookie
   * @method Cookie#getCookie
   * @param {String} name - Cookie key
   * @param {Object} opts  cookie options
   * @return {String} cookie value
   */
  getCookie(name, opts) {
    return this.cookies.get(name, opts);
  },

  /**
   * 删除 Cookie
   * @method Cookie#deleteCookie
   * @param {String} name - Cookie key
   * @param {Object} opts  cookie options
   * @return {Context} koa context
   */
  deleteCookie(name, opts) {
    this.setCookie(name, null, opts);
    return this;
  },

  /**
   * 应用 Web 相关日志，用于记录 Web 行为相关的日志，
   * 最终日志文件输出到 `{log.dir}/{app.name}-web.log` 中。
   * 每行日志会自动记录上当前请求的一些基本信息，
   * 如 `[$logonId/$userId/$ip/$timestamp_ms/$sofaTraceId $use_ms $method $url]`
   * @member {ContextLogger} Context#logger
   * @since 1.0.0
   * @example
   * ```js
   * this.logger.info('some request data: %j', this.request.body);
   * this.logger.warn('WARNING!!!!');
   * ```
   * 错误日志记录，直接会将错误日志完整堆栈信息记录下来，并且输出到 `{log.dir}/common-error.log`
   * ```
   * this.logger.error(err);
   * ```
   */
  get logger() {
    if (!this[LOGGER]) {
      this[LOGGER] = new ContextLogger(this, this.app.logger);
    }
    return this[LOGGER];
  },

  /**
   * app context 级别的 core logger，适合 core 对当前请求记录日志使用
   * @member {ContextLogger} Context#coreLogger
   * @since 1.0.0
   */
  get coreLogger() {
    if (!this[CORE_LOGGER]) {
      this[CORE_LOGGER] = new ContextLogger(this, this.app.coreLogger);
    }
    return this[CORE_LOGGER];
  },

  /**
   * 设置 jsonp 的内容，将会以 jsonp 的方式返回。注意：不可读。
   * @member {Void} Context#jsonp
   * @param {Object} obj 设置的对象
   */
  set jsonp(obj) {
    const options = this.app.config.jsonp;
    const jsonpFunction = this.query[options.callback];
    if (!jsonpFunction) {
      this.body = obj;
    } else {
      this.set('x-content-type-options', 'nosniff');
      this.type = 'js';
      this.body = jsonpBody(obj, jsonpFunction, options);
    }
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

delegate(proto, 'request')
  .getter('isAjax')
  .getter('acceptJSON')
  .getter('queries')
  .getter('accept');
