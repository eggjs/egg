import { performance } from 'node:perf_hooks';
import path from 'node:path';
import fs from 'node:fs';
import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import inspector from 'node:inspector';
import { fileURLToPath } from 'node:url';
import { EggCore, type EggCoreContext, type EggCoreOptions } from '@eggjs/core';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import createClusterClient, { close as closeClusterClient } from 'cluster-client';
import { extend } from 'extend2';
import { EggContextLogger as ContextLogger, EggLoggers, EggLogger } from 'egg-logger';
import { Cookies as ContextCookies } from '@eggjs/cookies';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import CircularJSON from 'circular-json-for-egg';
import type { Agent } from './agent.js';
import type { Application } from './application.js';
import type { EggAppConfig } from './type.js';
import { create as createMessenger, IMessenger } from './core/messenger/index.js';
import { ContextHttpClient } from './core/context_httpclient.js';
import {
  HttpClient, type HttpClientRequestOptions, type HttpClientRequestURL, type HttpClientResponse,
} from './core/httpclient.js';
import { createLoggers } from './core/logger.js';
import {
  Singleton, type SingletonCreateMethod, type SingletonOptions,
} from './core/singleton.js';
import { convertObject } from './core/utils.js';
import { BaseContextClass } from './core/base_context_class.js';
import { BaseHookClass } from './core/base_hook_class.js';
import type { EggApplicationLoader } from './loader/index.js';

const EGG_PATH = Symbol.for('egg#eggPath');

export interface EggApplicationCoreOptions extends Omit<EggCoreOptions, 'baseDir'> {
  mode?: 'cluster' | 'single';
  clusterPort?: number;
  baseDir?: string;
}

export interface EggContext extends EggCoreContext {
  app: EggApplicationCore;
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
}

/**
 * Based on koa's Application
 * @see https://github.com/eggjs/egg-core
 * @see https://github.com/eggjs/koa/blob/master/src/application.ts
 * @augments EggCore
 */
export class EggApplicationCore extends EggCore {
  // export context base classes, let framework can impl sub class and over context extend easily.
  ContextCookies = ContextCookies;
  ContextLogger = ContextLogger;
  ContextHttpClient = ContextHttpClient;
  HttpClient = HttpClient;
  /**
   * Retrieve base context class
   * @member {BaseContextClass} BaseContextClass
   * @since 1.0.0
   */
  BaseContextClass = BaseContextClass;

  /**
   * Retrieve base controller
   * @member {Controller} Controller
   * @since 1.0.0
   */
  Controller = BaseContextClass;

  /**
   * Retrieve base service
   * @member {Service} Service
   * @since 1.0.0
   */
  Service = BaseContextClass;

  /**
   * Retrieve base subscription
   * @member {Subscription} Subscription
   * @since 2.12.0
   */
  Subscription = BaseContextClass;

  /**
   * Retrieve base context class
   * @member {BaseHookClass} BaseHookClass
   */
  BaseHookClass = BaseHookClass;

  /**
   * Retrieve base boot
   * @member {Boot}
   */
  Boot = BaseHookClass;

  declare options: Required<EggApplicationCoreOptions>;

  #httpClient?: HttpClient;
  #loggers?: EggLoggers;
  #clusterClients: any[] = [];

  readonly messenger: IMessenger;
  agent?: Agent;
  application?: Application;
  declare loader: EggApplicationLoader;

  /**
   * @class
   * @param {Object} options
   *  - {Object} [type] - type of instance, Agent and Application both extend koa, type can determine what it is.
   *  - {String} [baseDir] - app root dir, default is `process.cwd()`
   *  - {Object} [plugins] - custom plugin config, use it in unittest
   *  - {String} [mode] - process mode, can be cluster / single, default is `cluster`
   */
  constructor(options?: EggApplicationCoreOptions) {
    options = {
      mode: 'cluster',
      type: 'application',
      baseDir: process.cwd(),
      ...options,
    };
    super(options);
    /**
     * messenger instance
     * @member {Messenger}
     * @since 1.0.0
     */
    this.messenger = createMessenger(this);

    // trigger `serverDidReady` hook when all the app workers
    // and agent worker are ready
    this.messenger.once('egg-ready', () => {
      this.lifecycle.triggerServerDidReady();
    });
    this.load();
  }

  protected async loadConfig() {
    await this.loader.loadConfig();
  }

  protected async load() {
    await this.loadConfig();
    // dump config after ready, ensure all the modifications during start will be recorded
    // make sure dumpConfig is the last ready callback
    this.ready(() => process.nextTick(() => {
      const dumpStartTime = Date.now();
      this.dumpConfig();
      this.dumpTiming();
      this.coreLogger.info('[egg] dump config after ready, %sms', Date.now() - dumpStartTime);
    }));
    this.#setupTimeoutTimer();

    this.console.info('[egg] App root: %s', this.baseDir);
    this.console.info('[egg] All *.log files save on %j', this.config.logger.dir);
    this.console.info('[egg] Loaded enabled plugin %j', this.loader.orderPlugins);

    // Listen the error that promise had not catch, then log it in common-error
    this._unhandledRejectionHandler = this._unhandledRejectionHandler.bind(this);
    process.on('unhandledRejection', this._unhandledRejectionHandler);

    // register close function
    this.lifecycle.registerBeforeClose(async () => {
      // close all cluster clients
      for (const clusterClient of this.#clusterClients) {
        await closeClusterClient(clusterClient);
      }
      this.#clusterClients = [];

      // single process mode will close agent before app close
      if (this.type === 'application' && this.options.mode === 'single') {
        await this.agent!.close();
      }

      for (const logger of this.loggers.values()) {
        logger.close();
      }
      this.messenger.close();
      process.removeListener('unhandledRejection', this._unhandledRejectionHandler);
    });

    await this.loader.load();
  }

  /**
   * Wrap the Client with Leader/Follower Pattern
   *
   * @description almost the same as Agent.cluster API, the only different is that this method create Follower.
   *
   * @see https://github.com/node-modules/cluster-client
   * @param {Function} clientClass - client class function
   * @param {Object} [options]
   *   - {Boolean} [autoGenerate] - whether generate delegate rule automatically, default is true
   *   - {Function} [formatKey] - a method to transform the subscription info into a string，default is JSON.stringify
   *   - {Object} [transcode|JSON.stringify/parse]
   *     - {Function} encode - custom serialize method
   *     - {Function} decode - custom deserialize method
   *   - {Boolean} [isBroadcast] - whether broadcast subscription result to all followers or just one, default is true
   *   - {Number} [responseTimeout] - response timeout, default is 3 seconds
   *   - {Number} [maxWaitTime|30000] - leader startup max time, default is 30 seconds
   * @return {ClientWrapper} wrapper
   */
  cluster(clientClass: unknown, options: object) {
    const clientClassOptions = {
      ...this.config.clusterClient,
      ...options,
      singleMode: this.options.mode === 'single',
      // cluster need a port that can't conflict on the environment
      port: this.options.clusterPort,
      // agent worker is leader, app workers are follower
      isLeader: this.type === 'agent',
      logger: this.coreLogger,
      // debug mode does not check heartbeat
      isCheckHeartbeat: this.config.env === 'prod' ? true : inspector.url() === undefined,
    };
    const client = createClusterClient(clientClass, clientClassOptions);
    this.#patchClusterClient(client);
    return client;
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
   *   name: 'mock-app',
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
  inspect(): any {
    const res = {
      env: this.config.env,
    };

    function delegate(res: any, app: any, keys: string[]) {
      for (const key of keys) {
        if (app[key]) {
          res[key] = app[key];
        }
      }
    }

    function abbr(res: any, app: any, keys: string[]) {
      for (const key of keys) {
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
   * @param {Object} options
   * - method {String} - Request method, defaults to GET. Could be GET, POST, DELETE or PUT. Alias 'type'.
   * - data {Object} - Data to be sent. Will be stringify automatically.
   * - dataType {String} - String - Type of response data. Could be `text` or `json`.
   *   If it's `text`, the callback data would be a String.
   *   If it's `json`, the data of callback would be a parsed JSON Object.
   *   Default callback data would be a Buffer.
   * - headers {Object} - Request headers.
   * - timeout {Number} - Request timeout in milliseconds. Defaults to exports.TIMEOUT.
   *   Include remote server connecting timeout and response timeout.
   *   When timeout happen, will return ConnectionTimeout or ResponseTimeout.
   * - auth {String} - `username:password` used in HTTP Basic Authorization.
   * - followRedirect {Boolean} - follow HTTP 3xx responses as redirects. defaults to false.
   * - gzip {Boolean} - let you get the res object when request connected, default false. alias customResponse
   * - nestedQuerystring {Boolean} - urllib default use querystring to stringify form data which don't
   *   support nested object, will use qs instead of querystring to support nested object by set this option to true.
   * - more options see https://github.com/node-modules/urllib
   * @return {Object}
   * - status {Number} - HTTP response status
   * - headers {Object} - HTTP response headers
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
  async curl<T = any>(url: HttpClientRequestURL, options?: HttpClientRequestOptions): Promise<HttpClientResponse<T>> {
    return await this.httpClient.request<T>(url, options);
  }

  /**
   * HttpClient instance
   * @see https://github.com/node-modules/urllib
   * @member {HttpClient}
   */
  get httpClient() {
    if (!this.#httpClient) {
      this.#httpClient = new this.HttpClient(this);
    }
    return this.#httpClient;
  }

  /**
   * @deprecated please use httpClient instead
   * @alias httpClient
   * @member {HttpClient}
   */
  get httpclient() {
    return this.httpClient;
  }

  /**
   * All loggers contain logger, coreLogger and customLogger
   * @member {Object}
   * @since 1.0.0
   */
  get loggers() {
    if (!this.#loggers) {
      this.#loggers = createLoggers(this);
    }
    return this.#loggers;
  }

  /**
   * Get logger by name, it's equal to app.loggers['name'],
   * but you can extend it with your own logical.
   * @param {String} name - logger name
   * @return {Logger} logger
   */
  getLogger(name: string): EggLogger {
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

  _unhandledRejectionHandler(err: any) {
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
   */
  dumpConfigToObject() {
    let ignoreList: (string | RegExp)[];
    try {
      // support array and set
      ignoreList = Array.from(this.config.dump.ignore);
    } catch (_) {
      ignoreList = [];
    }
    const config = extend(true, {}, {
      config: this.config,
      plugins: this.loader.allPlugins,
      appInfo: this.loader.appInfo,
    });
    convertObject(config, ignoreList);
    return {
      config,
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
      if (!fs.existsSync(rundir)) {
        fs.mkdirSync(rundir);
      }

      // get dumped object
      const { config, meta } = this.dumpConfigToObject();

      // dump config
      const dumpFile = path.join(rundir, `${this.type}_config.json`);
      fs.writeFileSync(dumpFile, CircularJSON.stringify(config, null, 2));

      // dump config meta
      const dumpMetaFile = path.join(rundir, `${this.type}_config_meta.json`);
      fs.writeFileSync(dumpMetaFile, CircularJSON.stringify(meta, null, 2));
    } catch (err: any) {
      this.coreLogger.warn(`[egg] dumpConfig error: ${err.message}`);
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
      // show duration >= ${slowBootActionMinDuration}ms action to warning log
      for (const item of items) {
        // ignore #0 name: Process Start
        if (item.index > 0 && item.duration && item.duration >= this.config.dump.timing.slowBootActionMinDuration) {
          this.coreLogger.warn('[egg][dumpTiming][slow-boot-action] #%d %dms, name: %s',
            item.index, item.duration, item.name);
        }
      }
    } catch (err: any) {
      this.coreLogger.warn(`[egg] dumpTiming error: ${err.message}`);
    }
  }

  get [EGG_PATH]() {
    if (typeof __dirname !== 'undefined') {
      return path.dirname(__dirname);
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  }

  #setupTimeoutTimer() {
    const startTimeoutTimer = setTimeout(() => {
      this.coreLogger.error(this.timing.toString());
      this.coreLogger.error(`${this.type} still doesn't ready after ${this.config.workerStartTimeout} ms.`);
      // log unfinished
      const items = this.timing.toJSON();
      for (const item of items) {
        if (item.end) continue;
        this.coreLogger.error(`unfinished timing item: ${CircularJSON.stringify(item)}`);
      }
      this.coreLogger.error('[egg][setupTimeoutTimer] check run/%s_timing_%s.json for more details.',
        this.type, process.pid);
      this.emit('startTimeout');
      this.dumpConfig();
      this.dumpTiming();
    }, this.config.workerStartTimeout);
    this.ready(() => clearTimeout(startTimeoutTimer));
  }

  get config() {
    return super.config as EggAppConfig;
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
  addSingleton(name: string, create: SingletonCreateMethod) {
    const options: SingletonOptions = {
      name,
      create,
      app: this,
    };
    const singleton = new Singleton(options);
    const initPromise = singleton.init();
    if (initPromise) {
      this.beforeStart(async () => {
        await initPromise;
      });
    }
  }

  #patchClusterClient(client: any) {
    const rawCreate = client.create;
    client.create = (...args: any) => {
      const realClient = rawCreate.apply(client, args);
      this.#clusterClients.push(realClient);
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
  createAnonymousContext(req?: any): EggCoreContext {
    const request: any = {
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
  createContext(req: IncomingMessage, res: ServerResponse): EggContext {
    const context = Object.create(this.context) as EggContext;
    const request = context.request = Object.create(this.request);
    const response = context.response = Object.create(this.response);
    context.app = request.app = response.app = this;
    context.req = request.req = response.req = req;
    context.res = request.res = response.res = res;
    request.ctx = response.ctx = context;
    request.response = response;
    response.request = request;
    context.onerror = context.onerror.bind(context);
    context.originalUrl = request.originalUrl = req.url as string;
    context.starttime = Date.now();
    context.performanceStarttime = performance.now();
    return context;
  }
}
