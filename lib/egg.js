'use strict';

const path = require('path');
const fs = require('fs');
const EggCore = require('egg-core').EggCore;
const Messenger = require('./core/messenger');
const urllib = require('./core/urllib');
const createLoggers = require('./core/logger');

const URLLIB = Symbol('EggApplication#urllib');
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
      'urllib',
      'tair',
      'hsf',
      'loggers',
    ]);
    return res;
  }

  /**
   * 对 {@link urllib} 的封装，会自动记录调用日志，参数跟 `urllib.request(url, args)` 保持一致.
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
   *
   * 更多参数请访问: https://github.com/node-modules/urllib#api-doc
   * @return {Object} -
   * - status {Number} - HTTP Response Status
   * - headers {Object} - HTTP Response Headers
   * - res {Object} - HTTP Response Object
   * - data {Object}
   * @example
   * ```js
   * yield app.curl('http://example.com/foo.json', {
   *   method: 'GET',
   *   dataType: 'json
   * });
   * ```
   */
  * curl(url, opts) {
    return yield this.urllib.request(url, opts);
  }

  /**
   * 需要统一记录 httpclient log, app 也必须使用相同的
   * 参考: [urllib](https://npmjs.com/package/urllib)
   * @member {Urllib}
   */
  get urllib() {
    if (!this[URLLIB]) {
      this[URLLIB] = urllib(this);
    }
    return this[URLLIB];
  }

  /**
   * logger 集合，包含两个：
   *  - 应用使用：loggers.logger
   *  - 框架使用：loggers.coreLogger
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
   * 同 {@link Agent#coreLogger} 相同
   * @member {Logger}
   * @since 1.0.0
   */
  get logger() {
    return this.loggers.logger;
  }

  /**
   * agent 的 logger，日志生成到 $HOME/logs/${agentLogName}
   * @member {Logger}
   * @since 1.0.0
   */
  get coreLogger() {
    return this.loggers.coreLogger;
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
   * 关闭 app 上的所有事件监听
   * @public
   */
  close() {
    super.close();
    this.messenger.close();
    process.removeListener('unhandledRejection', this._unhandledRejectionHandler);
  }
}

module.exports = EggApplication;
