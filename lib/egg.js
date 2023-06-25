const { performance } = require('perf_hooks');
const path = require('path');
const fs = require('fs');
const ms = require('ms');
const http = require('http');
const EggCore = require('egg-core').EggCore;
const cluster = require('cluster-client');
const extend = require('extend2');
const ContextLogger = require('egg-logger').EggContextLogger;
const ContextCookies = require('egg-cookies');
const CircularJSON = require('circular-json-for-egg');
const ContextHttpClient = require('./core/context_httpclient');
const Messenger = require('./core/messenger');
const DNSCacheHttpClient = require('./core/dnscache_httpclient');
const HttpClient = require('./core/httpclient');
const HttpClientNext = require('./core/httpclient_next');
const createLoggers = require('./core/logger');
const Singleton = require('./core/singleton');
const utils = require('./core/utils');
const BaseContextClass = require('./core/base_context_class');
const BaseHookClass = require('./core/base_hook_class');

const HTTPCLIENT = Symbol('EggApplication#httpclient');
const LOGGERS = Symbol('EggApplication#loggers');
const EGG_PATH = Symbol.for('egg#eggPath');
const CLUSTER_CLIENTS = Symbol.for('egg#clusterClients');

/**
 * Based on koa's Application
 * @see https://github.com/eggjs/egg-core
 * @see http://koajs.com/#application
 * @augments EggCore
 */
class EggApplication extends EggCore {

  /**
   * @class
   * @param {Object} options
   *  - {Object} [type] - type of instance, Agent and Application both extend koa, type can determine what it is.
   *  - {String} [baseDir] - app root dir, default is `process.cwd()`
   *  - {Object} [plugins] - custom plugin config, use it in unittest
   *  - {String} [mode] - process mode, can be cluster / single, default is `cluster`
   */
  constructor(options = {}) {
    options.mode = options.mode || 'cluster';
    super(options);

    // export context base classes, let framework can impl sub class and over context extend easily.
    this.ContextCookies = ContextCookies;
    this.ContextLogger = ContextLogger;
    this.ContextHttpClient = ContextHttpClient;
    this.HttpClient = HttpClient;
    this.HttpClientNext = HttpClientNext;

    this.loader.loadConfig();

    /**
     * messenger instance
     * @member {Messenger}
     * @since 1.0.0
     */
    this.messenger = Messenger.create(this);

    // trigger `serverDidReady` hook when all the app workers
    // and agent worker are ready
    this.messenger.once('egg-ready', () => {
      this.lifecycle.triggerServerDidReady();
    });

    // dump config after ready, ensure all the modifications during start will be recorded
    // make sure dumpConfig is the last ready callback
    this.ready(() => process.nextTick(() => {
      const dumpStartTime = Date.now();
      this.dumpConfig();
      this.dumpTiming();
      this.coreLogger.info('[egg:core] dump config after ready, %s', ms(Date.now() - dumpStartTime));
    }));
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
        singleMode: this.options.mode === 'single',
        // cluster need a port that can't conflict on the environment
        port: this.options.clusterPort,
        // agent worker is leader, app workers are follower
        isLeader: this.type === 'agent',
        logger: this.coreLogger,
        // debug mode does not check heartbeat
        isCheckHeartbeat: this.config.env === 'prod' ? true : require('inspector').url() === undefined,
      });
      const client = cluster(clientClass, options);
      this._patchClusterClient(client);
      return client;
    };

    // register close function
    this.beforeClose(async () => {
      // single process mode will close agent before app close
      if (this.type === 'application' && this.options.mode === 'single') {
        await this.agent.close();
      }

      for (const logger of this.loggers.values()) {
        logger.close();
      }
      this.messenger.close();
      process.removeListener('unhandledRejection', this._unhandledRejectionHandler);
    });

    /**
     * Retreive base context class
     * @member {BaseContextClass} BaseContextClass
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

    /**
     * Retreive base subscription
     * @member {Subscription} Subscription
     * @since 2.12.0
     */
    this.Subscription = BaseContextClass;

    /**
     * Retreive base context class
     * @member {BaseHookClass} BaseHookClass
     */
    this.BaseHookClass = BaseHookClass;

    /**
     * Retreive base boot
     * @member {Boot}
     */
    this.Boot = BaseHookClass;
  }

  /**
   * print the information when console.log(app)
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
      'httpclient',
      'loggers',
      'middlewares',
      'router',
      'serviceClasses',
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
   * const result = await app.curl('http://example.com/foo.json', {
   *   method: 'GET',
   *   dataType: 'json',
   * });
   * console.log(result.status, result.headers, result.data);
   * ```
   */
  async curl(url, opts) {
    return await this.httpclient.request(url, opts);
  }

  /**
   * HttpClient instance
   * @see https://github.com/node-modules/urllib
   * @member {HttpClient}
   */
  get httpclient() {
    if (!this[HTTPCLIENT]) {
      if (this.config.httpclient.useHttpClientNext) {
        this[HTTPCLIENT] = new this.HttpClientNext(this);
      } else if (this.config.httpclient.enableDNSCache) {
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
   * dump out the config and meta object
   * @private
   * @return {Object} the result
   */
  dumpConfigToObject() {
    let ignoreList;
    try {
      // support array and set
      ignoreList = Array.from(this.config.dump.ignore);
    } catch (_) {
      ignoreList = [];
    }

    const json = extend(true, {}, { config: this.config, plugins: this.loader.allPlugins, appInfo: this.loader.appInfo });
    utils.convertObject(json, ignoreList);
    return {
      config: json,
      meta: this.loader.configMeta,
    };
  }

  /**
   * save app.config to `run/${type}_config.json`
   * @private
   */
  dumpConfig() {
    const rundir = this.config.rundir;
    try {
      /* istanbul ignore if */
      if (!fs.existsSync(rundir)) fs.mkdirSync(rundir);

      // get dumpped object
      const { config, meta } = this.dumpConfigToObject();

      // dump config
      const dumpFile = path.join(rundir, `${this.type}_config.json`);
      fs.writeFileSync(dumpFile, CircularJSON.stringify(config, null, 2));

      // dump config meta
      const dumpMetaFile = path.join(rundir, `${this.type}_config_meta.json`);
      fs.writeFileSync(dumpMetaFile, CircularJSON.stringify(meta, null, 2));
    } catch (err) {
      this.coreLogger.warn(`dumpConfig error: ${err.message}`);
    }
  }

  dumpTiming() {
    try {
      const items = this.timing.toJSON();
      const rundir = this.config.rundir;
      const dumpFile = path.join(rundir, `${this.type}_timing_${process.pid}.json`);
      fs.writeFileSync(dumpFile, CircularJSON.stringify(items, null, 2));
      this.coreLogger.info(this.timing.toString());
      // only disable, not clear bootstrap timing data.
      this.timing.disable();
      // show duration >= ${slowBootActionMinDuration}ms action to warnning log
      for (const item of items) {
        // ignore #0 name: Process Start
        if (item.index > 0 && item.duration >= this.config.dump.timing.slowBootActionMinDuration) {
          this.coreLogger.warn('[egg:core][slow-boot-action] #%d %dms, name: %s',
            item.index, item.duration, item.name);
        }
      }
    } catch (err) {
      this.coreLogger.warn(`dumpTiming error: ${err.message}`);
    }
  }

  get [EGG_PATH]() {
    return path.join(__dirname, '..');
  }

  _setupTimeoutTimer() {
    const startTimeoutTimer = setTimeout(() => {
      this.coreLogger.error(this.timing.toString());
      this.coreLogger.error(`${this.type} still doesn't ready after ${this.config.workerStartTimeout} ms.`);
      // log unfinished
      const items = this.timing.toJSON();
      for (const item of items) {
        if (item.end) continue;
        this.coreLogger.error(`unfinished timing item: ${CircularJSON.stringify(item)}`);
      }
      this.coreLogger.error(`check run/${this.type}_timing_${process.pid}.json for more details.`);
      this.emit('startTimeout');
      this.dumpConfig();
      this.dumpTiming();
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
   * @param {Function|AsyncFunction} create - method will be invoked when singleton instance create
   */
  addSingleton(name, create) {
    const options = {};
    options.name = name;
    options.create = create;
    options.app = this;
    const singleton = new Singleton(options);
    const initPromise = singleton.init();
    if (initPromise) {
      this.beforeStart(async () => {
        await initPromise;
      });
    }
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

  /**
   * Create an anonymous context, the context isn't request level, so the request is mocked.
   * then you can use context level API like `ctx.service`
   * @member {String} EggApplication#createAnonymousContext
   * @param {Request} [req] - if you want to mock request like querystring, you can pass an object to this function.
   * @return {Context} context
   */
  createAnonymousContext(req) {
    const request = {
      headers: {
        host: '127.0.0.1',
        'x-forwarded-for': '127.0.0.1',
      },
      query: {},
      querystring: '',
      host: '127.0.0.1',
      hostname: '127.0.0.1',
      protocol: 'http',
      secure: 'false',
      method: 'GET',
      url: '/',
      path: '/',
      socket: {
        remoteAddress: '127.0.0.1',
        remotePort: 7001,
      },
    };
    if (req) {
      for (const key in req) {
        if (key === 'headers' || key === 'query' || key === 'socket') {
          Object.assign(request[key], req[key]);
        } else {
          request[key] = req[key];
        }
      }
    }
    const response = new http.ServerResponse(request);
    return this.createContext(request, response);
  }

  /**
   * Create egg context
   * @function EggApplication#createContext
   * @param  {Req} req - node native Request object
   * @param  {Res} res - node native Response object
   * @return {Context} context object
   */
  createContext(req, res) {
    const app = this;
    const context = Object.create(app.context);
    const request = context.request = Object.create(app.request);
    const response = context.response = Object.create(app.response);
    context.app = request.app = response.app = app;
    context.req = request.req = response.req = req;
    context.res = request.res = response.res = res;
    request.ctx = response.ctx = context;
    request.response = response;
    response.request = request;
    context.onerror = context.onerror.bind(context);
    context.originalUrl = request.originalUrl = req.url;

    /**
     * Request start time
     * @member {Number} Context#starttime
     */
    context.starttime = Date.now();

    if (this.config.logger.enablePerformanceTimer) {
      /**
       * Request start timer using `performance.now()`
       * @member {Number} Context#performanceStarttime
       */
      context.performanceStarttime = performance.now();
    }
    return context;
  }

}

module.exports = EggApplication;
