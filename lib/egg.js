'use strict';

const path = require('path');
const fs = require('fs');
const EggCore = require('egg-core').EggCore;
const cluster = require('cluster-client');
const extend = require('extend2');
const ContextLogger = require('egg-logger').EggContextLogger;
const ContextCookies = require('egg-cookies');
const ContextHttpClient = require('./core/context_httpclient');
const Messenger = require('./core/messenger');
const DNSCacheHttpClient = require('./core/dnscache_httpclient');
const HttpClient = require('./core/httpclient');
const createLoggers = require('./core/logger');
const Singleton = require('./core/singleton');
const utils = require('./core/utils');
const BaseContextClass = require('./core/base_context_class');

const HTTPCLIENT = Symbol('EggApplication#httpclient');
const LOGGERS = Symbol('EggApplication#loggers');
const EGG_PATH = Symbol.for('egg#eggPath');
const CLUSTER_CLIENTS = Symbol.for('egg#clusterClients');

/**
 * Base on koa's Application
 * @see https://github.com/eggjs/egg-core
 * @see http://koajs.com/#application
 * @extends EggCore
 */
class EggApplication extends EggCore {

  /**
   * @constructor
   * @param {Object} options
   *  - {Object} [type] - type of instance, Agent and Application both extend koa, type can determine what it is.
   *  - {String} [baseDir] - app root dir, default is `process.cwd()`
   *  - {Object} [plugins] - custom plugin config, use it in unittest
   */
  constructor(options) {
    super(options);

    // export context base classes, let framework can impl sub class and over context extend easily.
    this.ContextCookies = ContextCookies;
    this.ContextLogger = ContextLogger;
    this.ContextHttpClient = ContextHttpClient;
    this.HttpClient = HttpClient;

    this.loader.loadConfig();

    /**
     * messenger instance
     * @member {Messenger}
     * @since 1.0.0
     */
    this.messenger = new Messenger();

    // dump config after ready, ensure all the modifications during start will be recorded
    this.ready(() => this.dumpConfig());
    this._setupTimeoutTimer();

    this.console.info('[egg:core] App root: %s', this.baseDir);
    this.console.info('[egg:core] All *.log files save on %j', this.config.logger.dir);
    this.console.info('[egg:core] Loaded enabled plugin %j', this.loader.orderPlugins);

    // Listen the error that promise had not catch, then log it in common-error
    this._unhandledRejectionHandler = this._unhandledRejectionHandler.bind(this);
    process.on('unhandledRejection', this._unhandledRejectionHandler);

    this[CLUSTER_CLIENTS] = [];

    /**
     * Wrap the Client with Leader/Follower Pattern
     *
     * @description almost the same as Agent.cluster API, the only different is that this method create Follower.
     *
     * @see https://github.com/node-modules/cluster-client
     * @param {Function} clientClass - client class function
     * @param {Object} [options]
     *   - {Boolean} [autoGenerate] - whether generate delegate rule automatically, default is true
     *   - {Function} [formatKey] - a method to tranform the subscription info into a string，default is JSON.stringify
     *   - {Object} [transcode|JSON.stringify/parse]
     *     - {Function} encode - custom serialize method
     *     - {Function} decode - custom deserialize method
     *   - {Boolean} [isBroadcast] - whether broadcast subscrption result to all followers or just one, default is true
     *   - {Number} [responseTimeout] - response timeout, default is 3 seconds
     *   - {Number} [maxWaitTime|30000] - leader startup max time, default is 30 seconds
     * @return {ClientWrapper} wrapper
     */
    this.cluster = (clientClass, options) => {
      options = Object.assign({}, this.config.clusterClient, options, {
        // cluster need a port that can't conflict on the environment
        port: this.options.clusterPort,
        // agent worker is leader, app workers are follower
        isLeader: this.type === 'agent',
        logger: this.coreLogger,
      });
      const client = cluster(clientClass, options);
      this._patchClusterClient(client);
      return client;
    };

    // register close function
    this.beforeClose(() => {
      for (const logger of this.loggers.values()) {
        logger.close();
      }
      this.messenger.close();
      process.removeListener('unhandledRejection', this._unhandledRejectionHandler);
    });

    /**
     * Retreive base context class
     * @member {Controller} BaseContextClass
     * @since 1.0.0
     */
    this.BaseContextClass = BaseContextClass;

    /**
     * Retreive base controller
     * @member {Controller} Controller
     * @since 1.0.0
     */
    this.Controller = BaseContextClass;

    /**
     * Retreive base service
     * @member {Service} Service
     * @since 1.0.0
     */
    this.Service = BaseContextClass;
  }

  /**
   * print the infomation when console.log(app)
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
    const res = {
      env: this.config.env,
    };

    function delegate(res, app, keys) {
      for (const key of keys) {
        /* istanbul ignore else */
        if (app[key]) {
          res[key] = app[key];
        }
      }
    }

    function abbr(res, app, keys) {
      for (const key of keys) {
        /* istanbul ignore else */
        if (app[key]) {
          res[key] = `<egg ${key}>`;
        }
      }
    }

    delegate(res, this, [
      'name',
      'baseDir',
      'subdomainOffset',
    ]);

    abbr(res, this, [
      'config',
      'controller',
      'serviceClasses',
      'middlewares',
      'httpclient',
      'loggers',
    ]);

    return res;
  }

  toJSON() {
    return this.inspect();
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
   * - nestedQuerystring {Boolean} - urllib default use querystring to stringify form data which don't
   *   support nested object, will use qs instead of querystring to support nested object by set this option to true.
   * - more options see https://www.npmjs.com/package/urllib
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
   *   dataType: 'json',
   * });
   * console.log(result.status, result.headers, result.data);
   * ```
   */
  curl(url, opts) {
    return this.httpclient.request(url, opts);
  }

  /**
   * HttpClient instance
   * @see https://github.com/node-modules/urllib
   * @member {HttpClient}
   */
  get httpclient() {
    if (!this[HTTPCLIENT]) {
      if (this.config.httpclient.enableDNSCache) {
        this[HTTPCLIENT] = new DNSCacheHttpClient(this);
      } else {
        this[HTTPCLIENT] = new this.HttpClient(this);
      }
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
   * application logger, log file is `$HOME/logs/{appname}/{appname}-web`
   * @member {Logger}
   * @since 1.0.0
   */
  get logger() {
    return this.getLogger('logger');
  }

  /**
   * core logger for framework and plugins, log file is `$HOME/logs/{appname}/egg-web`
   * @member {Logger}
   * @since 1.0.0
   */
  get coreLogger() {
    return this.getLogger('coreLogger');
  }

  _unhandledRejectionHandler(err) {
    if (!(err instanceof Error)) {
      const newError = new Error(String(err));
      // err maybe an object, try to copy the name, message and stack to the new error instance
      /* istanbul ignore else */
      if (err) {
        if (err.name) newError.name = err.name;
        if (err.message) newError.message = err.message;
        if (err.stack) newError.stack = err.stack;
      }
      err = newError;
    }
    /* istanbul ignore else */
    if (err.name === 'Error') {
      err.name = 'unhandledRejectionError';
    }
    this.coreLogger.error(err);
  }

  /**
   * save app.config to `run/${type}_config.json`
   * @private
   */
  dumpConfig() {
    const rundir = this.config.rundir;
    let ignoreList;
    try {
      // support array and set
      ignoreList = Array.from(this.config.dump.ignore);
    } catch (_) {
      ignoreList = [];
    }
    try {
      /* istanbul ignore if */
      if (!fs.existsSync(rundir)) fs.mkdirSync(rundir);

      // dump config
      const json = extend(true, {}, { config: this.config, plugins: this.plugins });
      utils.convertObject(json, ignoreList);
      const dumpFile = path.join(rundir, `${this.type}_config.json`);
      fs.writeFileSync(dumpFile, JSON.stringify(json, null, 2));

      // dump config meta
      const dumpMetaFile = path.join(rundir, `${this.type}_config_meta.json`);
      fs.writeFileSync(dumpMetaFile, JSON.stringify(this.loader.configMeta, null, 2));
    } catch (err) {
      this.coreLogger.warn(`dumpConfig error: ${err.message}`);
    }
  }

  get [EGG_PATH]() {
    return path.join(__dirname, '..');
  }

  _setupTimeoutTimer() {
    const startTimeoutTimer = setTimeout(() => {
      this.coreLogger.error(`${this.type} still doesn't ready after ${this.config.workerStartTimeout} ms.`);
      this.emit('startTimeout');
    }, this.config.workerStartTimeout);
    this.ready(() => clearTimeout(startTimeoutTimer));
  }

  /**
   * app.env delegate app.config.env
   * @deprecated
   */
  get env() {
    this.deprecate('please use app.config.env instead');
    return this.config.env;
  }
  /* eslint no-empty-function: off */
  set env(_) {}

  /**
   * app.proxy delegate app.config.proxy
   * @deprecated
   */
  get proxy() {
    this.deprecate('please use app.config.proxy instead');
    return this.config.proxy;
  }
  /* eslint no-empty-function: off */
  set proxy(_) {}

  /**
   * create a singleton instance
   * @param {String} name - unique name for singleton
   * @param {Object} create - method will be invoked when singleton instance create
   */
  addSingleton(name, create) {
    const options = {};
    options.name = name;
    options.create = create;
    options.app = this;
    const singleton = new Singleton(options);
    singleton.init();
  }

  _patchClusterClient(client) {
    const create = client.create;
    client.create = (...args) => {
      const realClient = create.apply(client, args);
      this[CLUSTER_CLIENTS].push(realClient);
      this.beforeClose(() => cluster.close(realClient));
      return realClient;
    };
  }
}

module.exports = EggApplication;
