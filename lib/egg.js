'use strict';

const path = require('path');
const fs = require('fs');
const EggCore = require('egg-core').EggCore;
const Messenger = require('./core/messenger');
const createHttpClient = require('./core/httpclient');
const createLoggers = require('./core/logger');

const HTTPCLIENT = Symbol('EggApplication#httpclient');
const LOGGERS = Symbol('EggApplication#loggers');
const EGG_PATH = Symbol.for('egg#eggPath');

/**
 * Base on koa's Application
 * @see http://koajs.com/#application
 */
class EggApplication extends EggCore {

  /**
   * @constructor
   * @param {Object} options - 创建应用配置
   *  - {String} [baseDir] - app root dir, default is `process.cwd()`
   *  - {Object} [plugins] - 自定义插件配置，一般只用于单元测试
   */
  constructor(options) {
    super(options);

    this.loader.loadConfig();
    this._overrideAppConfig();

    // agent 和 worker 通信
    this.messenger = new Messenger();

    this.dumpConfig();
    this._setupTimeoutTimer();

    // 开始启动
    this.console.info('[egg:core] App root: %s', this.baseDir);
    this.console.info('[egg:core] All *.log files save on %j', this.config.logger.dir);
    this.console.info('[egg:core] Loaded enabled plugin %j', this.loader.orderPlugins);

    // 记录未处理的 promise reject
    // 每个进程调用一次即可
    this._unhandledRejectionHandler = this._unhandledRejectionHandler.bind(this);
    process.on('unhandledRejection', this._unhandledRejectionHandler);
  }

  /**
   * console.log(app) 的时候给出更准确的 app 信息
   * @return {Object} inspected app.
   * @since 1.0.0
   * @example
   * ```js
   * console.log(app);
   * =>
   * {
   *   name: 'mockapp',
   *   env: 'test',
   *   subdomainOffset: 2,
   *   config: '<egg config>',
   *   controller: '<egg controller>',
   *   service: '<egg service>',
   *   middlewares: '<egg middlewares>',
   *   urllib: '<egg urllib>',
   *   loggers: '<egg loggers>'
   * }
   * ```
   */
  inspect() {
    const res = {};

    function delegate(res, app, keys) {
      for (const key of keys) {
        if (app[key]) {
          res[key] = app[key];
        }
      }
    }

    function abbr(res, app, keys) {
      for (const key of keys) {
        if (app[key]) {
          res[key] = `<egg ${key}>`;
        }
      }
    }

    delegate(res, this, [
      'name',
      'baseDir',
      'env',
      'subdomainOffset',
    ]);

    abbr(res, this, [
      'config',
      'controller',
      'serviceClasses',
      'middlewares',
      'httpclient',
      'tair',
      'hsf',
      'loggers',
    ]);
    return res;
  }

  /**
   * http request helper base on {@link httpclient}, it will auto save httpclient log.
   * Keep the same api with `httpclient.request(url, args)`.
   *
   * See https://github.com/node-modules/urllib#api-doc for more details.
   *
   * @param {String} url request url address.
   * @param {Object} opts
   * - method {String} - Request method, defaults to GET. Could be GET, POST, DELETE or PUT. Alias 'type'.
   * - data {Object} - Data to be sent. Will be stringify automatically.
   * - dataType {String} - String - Type of response data. Could be `text` or `json`.
   *   If it's `text`, the callbacked data would be a String.
   *   If it's `json`, the data of callback would be a parsed JSON Object.
   *   Default callbacked data would be a Buffer.
   * - headers {Object} - Request headers.
   * - timeout {Number} - Request timeout in milliseconds. Defaults to exports.TIMEOUT.
   *   Include remote server connecting timeout and response timeout.
   *   When timeout happen, will return ConnectionTimeout or ResponseTimeout.
   * - auth {String} - `username:password` used in HTTP Basic Authorization.
   * - followRedirect {Boolean} - follow HTTP 3xx responses as redirects. defaults to false.
   * - gzip {Boolean} - let you get the res object when request connected, default false. alias customResponse
   * @return {Object}
   * - status {Number} - HTTP response status
   * - headers {Object} - HTTP response seaders
   * - res {Object} - HTTP response meta
   * - data {Object} - HTTP response body
   *
   * @example
   * ```js
   * const result = yield app.curl('http://example.com/foo.json', {
   *   method: 'GET',
   *   dataType: 'json,
   * });
   * console.log(result.status, result.headers, result.data);
   * ```
   */
  * curl(url, opts) {
    return yield this.httpclient.request(url, opts);
  }

  /**
   * HttpClient instance
   * @see https://github.com/node-modules/urllib
   * @member {HttpClient}
   */
  get httpclient() {
    if (!this[HTTPCLIENT]) {
      this[HTTPCLIENT] = createHttpClient(this);
    }
    return this[HTTPCLIENT];
  }

  /**
   *  All loggers contain logger, coreLogger and customLogger
   * @member {Object}
   * @since 1.0.0
   */
  get loggers() {
    if (!this[LOGGERS]) {
      this[LOGGERS] = createLoggers(this);
    }
    return this[LOGGERS];
  }

  /**
   * Get logger by name, it's equal to app.loggers['name'],
   * but you can extend it with your own logical.
   * @param {String} name - logger name
   * @return {Logger} logger
   */
  getLogger(name) {
    return this.loggers[name] || null;
  }

  /**
   * 同 {@link Agent#coreLogger} 相同
   * @member {Logger}
   * @since 1.0.0
   */
  get logger() {
    return this.getLogger('logger');
  }

  /**
   * agent 的 logger，日志生成到 $HOME/logs/${agentLogName}
   * @member {Logger}
   * @since 1.0.0
   */
  get coreLogger() {
    return this.getLogger('coreLogger');
  }

  _unhandledRejectionHandler(err) {
    if (!(err instanceof Error)) {
      err = new Error(String(err));
    }
    if (err.name === 'Error') {
      err.name = 'unhandledRejectionError';
    }
    this.coreLogger.error(err);
  }

  /**
   * 将 app.config 保存到 run/${type}_config.json 便于排查
   * @private
   */
  dumpConfig() {
    const rundir = this.config.rundir;
    const configdir = path.join(rundir, `${this.type}_config.json`);
    try {
      if (!fs.existsSync(rundir)) fs.mkdirSync(rundir);
      fs.writeFileSync(configdir, JSON.stringify({
        config: this.config,
        plugins: this.plugins,
      }, null, 2));
    } catch (err) {
      this.logger.warn(`dumpConfig error: ${err.message}`);
    }
  }

  get [EGG_PATH]() {
    return path.join(__dirname, '..');
  }

  _setupTimeoutTimer() {
    const startTimeoutTimer = setTimeout(() => {
      this.logger.error(`${this.type} still doesn't ready after ${this.config.workerStartTimeout} ms.`);
      this.emit('startTimeout');
    }, this.config.workerStartTimeout);
    this.ready(() => clearTimeout(startTimeoutTimer));
  }

  /**
   * override config in application
   * app.env delegate app.config.env, app.proxy delegate app.config.proxy
   */
  _overrideAppConfig() {
    const app = this;
    Object.defineProperties(app, {
      env: {
        get() {
          app.deprecate('please use app.config.env instead');
          return app.config.env;
        },
      },

      proxy: {
        get() {
          app.deprecate('please use app.config.proxy instead');
          return app.config.proxy;
        },
      },
    });
  }

  /**
   * 关闭 app 上的所有事件监听
   * @public
   * @return {Promise} promise
   */
  close() {
    for (const logger of this.loggers.values()) {
      logger.close();
    }
    this.messenger.close();
    process.removeListener('unhandledRejection', this._unhandledRejectionHandler);
    return super.close();
  }
}

module.exports = EggApplication;
