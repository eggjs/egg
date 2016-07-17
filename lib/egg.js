'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const KoaApplication = require('koa');
const Messenger = require('./core/messenger');
const urllib = require('./core/urllib');
const createLoggers = require('./core/logger');
const consoleLogger = require('./core/console');

const MESSENGER = Symbol('EggApplication#messenger');
const DEPRECATE = Symbol('EggApplication#deprecate');
const URLLIB = Symbol('EggApplication#urllib');
const LOGGERS = Symbol('EggApplication#loggers');

/**
 * Base on koa's Application
 * @see http://koajs.com/#application
 */
class EggApplication extends KoaApplication {

  /**
   * @constructor
   * @param {Object} options - 创建应用配置
   *  - {String} [baseDir] - app root dir, default is `process.cwd()`
   *  - {String} [customEgg] - 自定义 egg 插件集合层
   *  - {Object} [plugins] - 自定义插件配置，一般只用于单元测试
   */
  constructor(options) {
    options = options || {};
    options.baseDir = options.baseDir || process.cwd();

    // 确保 baseDir 存在，是字符串，并且所在目录存在
    assert(typeof options.baseDir === 'string', 'options.baseDir required, and must be a string');
    assert(fs.existsSync(options.baseDir), `Directory ${options.baseDir} not exists`);
    assert(fs.statSync(options.baseDir).isDirectory(), `Directory ${options.baseDir} is not a directory`);

    super();

    /**
     * {@link EggApplication} 初始化传入的参数
     * @member {Object} EggApplication#options
     */
    this._options = options;

    /**
     * console 的替代品，但可由 egg 进行控制
     * @member {Logger} EggApplication#console
     */
    this.console = consoleLogger;

    /**
     * 获取 app 的 Loader
     * @member {AppWorkerLoader} EggApplication#loader
     */
    options.app = this;
    options.console = consoleLogger;
    const Loader = this[Symbol.for('egg#loader')];
    const loader = this.loader = new Loader(options);
    loader.loadConfig();

    this._initReady();
    this.dumpConfig();

    // 开始启动
    this.console.info('[egg:core] App root: %s', this.baseDir);
    this.console.info('[egg:core] All *.log files save on %j', this.config.logger.dir);
    this.console.info('[egg:core] Loaded enabled plugin %j', loader.orderPlugins);

    // 记录未处理的 promise reject
    // 每个进程调用一次即可
    this._unhandledRejectionHandler = this._unhandledRejectionHandler.bind(this);
    process.on('unhandledRejection', this._unhandledRejectionHandler);
  }

  get type() {
    return this._options.type;
  }

  /**
   * 应用所在的代码根目录
   * @member {String}
   * @since 1.0.0
   */
  get baseDir() {
    return this._options.baseDir;
  }

  /**
   * agent 和 worker 通讯的信使，由 master 转发
   * @member {Messenger}
   * @since 1.0.0
   */
  get messenger() {
    if (!this[MESSENGER]) {
      this[MESSENGER] = new Messenger();
    }
    return this[MESSENGER];
  }

  /**
   * 统一的 depd API
   * @member {Function}
   * @see https://npmjs.com/package/depd
   * @since 1.0.0
   */
  get deprecate() {
    if (!this[DEPRECATE]) {
      // 延迟加载，这样允许单元测试通过 process.env.NO_DEPRECATION = '*' 设置不输出
      this[DEPRECATE] = require('depd')('egg');
    }
    return this[DEPRECATE];
  }

  /**
   * 当前应用名, 读取自 `package.json` 的 name 字段。
   * @member {String}
   * @since 1.0.0
   */
  get name() {
    return this.config.name;
  }

  /**
   * 获取配置，从 `config/config.${env}.js` 读取
   * @member {Object}
   * @since 1.0.0
   */
  get plugins() {
    return this.loader.plugins;
  }

  /**
   * 获取配置，从 `config/config.${env}.js` 读取
   * @member {Config}
   * @since 1.0.0
   */
  get config() {
    return this.loader.config;
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
   *   poweredBy: 'egg/1.0.0',
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
      'poweredBy',
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

  /**
   * 初始化 ready
   * @private
   */
  _initReady() {
    /**
     * 注册 ready 方法，当启动完成后触发此方法
     * @member {Function} EggApplication#ready
     * @since 1.0.0
     */

    /**
     * 异步启动接口，查看 https://github.com/koajs/koa-ready
     * 当所有注册的任务完成后才会触发 app.ready，启动才正式完成
     *
     * @member {Function} EggApplication#readyCallback
     * @since 1.0.0
     * @example
     * ```js
     * const done = app.readyCallback('configclient');
     * configclient.ready(done);
     * ```
     */
    // 默认 10s 没有 ready 就输出日志提示
    require('ready-callback')({ timeout: 10000 }).mixin(this);

    this.on('ready_stat', data => {
      this.console.info('[egg:core:ready_stat] end ready task %s, remain %j', data.id, data.remain);
    }).on('ready_timeout', id => {
      this.console.warn('[egg:core:ready_timeout] 10 seconds later %s was still unable to finish.', id);
    });
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

  /**
   * 关闭 app 上的所有事件监听
   * @public
   */
  close() {
    this.emit('close');
    this.removeAllListeners();
    this.messenger.close();
    process.removeListener('unhandledRejection', this._unhandledRejectionHandler);
  }
}

module.exports = EggApplication;
