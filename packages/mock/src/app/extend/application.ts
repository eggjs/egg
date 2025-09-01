import { debuglog } from 'node:util';
import http, { IncomingMessage } from 'node:http';
import fs from 'node:fs';
import assert from 'node:assert';
import mergeDescriptors from 'merge-descriptors';
import { isAsyncFunction, isObject } from 'is-type-of';
import { mock, restore } from 'mm';
import type { HttpClient } from 'urllib';
import { Transport, Logger, LoggerLevel, LoggerMeta } from 'egg-logger';
import { EggCore, type EggCoreOptions, type Context as EggCoreContext } from '@eggjs/core';
import type { Context as EggContext } from 'egg';
import { getMockAgent, restoreMockAgent } from '../../lib/mock_agent.js';
import {
  createMockHttpClient, MockResultFunction,
  MockResultOptions,
  MockHttpClientMethod,
} from '../../lib/mock_httpclient.js';
import { request as supertestRequest, EggTestRequest } from '../../lib/supertest.js';
import { MockOptions } from '../../lib/types.js';

const debug = debuglog('@eggjs/mock/app/extend/application');

const ORIGIN_TYPES = Symbol('@eggjs/mock originTypes');
const BACKGROUND_TASKS = Symbol('Application#backgroundTasks');
const REUSED_CTX = Symbol('Context#reusedInSuite');

export interface MockContextOptions {
  /**
   * mock ctxStorage or not, default is `true`
   */
  mockCtxStorage?: boolean;
  /**
   * reuse ctxStorage or not, default is `true`
   */
  reuseCtxStorage?: boolean;
}

export interface MockContextData {
  headers?: Record<string, string | string[]>;
  [key: string]: any;
}

// @ts-expect-error ignore type error
export interface MockContext extends EggContext, EggCoreContext {
  service: any;
}

export default abstract class ApplicationUnittest extends EggCore {
  [key: string]: any;
  declare options: MockOptions & EggCoreOptions;
  _mockHttpClient?: MockHttpClientMethod;
  declare httpclient: HttpClient;

  /**
   * mock Context
   * @function App#mockContext
   * @param {Object} data - ctx data
   * @param {Object} [options] - mock ctx options
   * @example
   * ```js
   * const ctx = app.mockContext({
   *   user: {
   *     name: 'Jason'
   *   }
   * });
   * console.log(ctx.user.name); // Jason
   *
   * // controller
   * module.exports = function*() {
   *   this.body = this.user.name;
   * };
   * ```
   */
  mockContext(data?: MockContextData, options?: MockContextOptions): MockContext {
    data = data ?? {};
    function mockRequest(req: IncomingMessage) {
      for (const key in data?.headers) {
        mock(req.headers, key, data.headers[key]);
        mock(req.headers, key.toLowerCase(), data.headers[key]);
      }
    }

    // try to use app.options.mockCtxStorage first
    const mockCtxStorage = this.options.mockCtxStorage ?? true;
    options = Object.assign({ mockCtxStorage }, options);

    if ('_customMockContext' in this && typeof this._customMockContext === 'function') {
      this._customMockContext(data);
    }

    // 使用者自定义mock，可以覆盖上面的 mock
    for (const key in data) {
      mock(this.context, key, data[key]);
    }

    const req = this.mockRequest(data);
    const res = new http.ServerResponse(req);

    if (options.reuseCtxStorage !== false) {
      if (this.currentContext && !this.currentContext[REUSED_CTX]) {
        mockRequest(this.currentContext.request.req);
        this.currentContext[REUSED_CTX] = true;
        return this.currentContext as MockContext;
      }
    }
    const ctx = this.createContext(req, res);
    if (options.mockCtxStorage) {
      mock(this.ctxStorage, 'getStore', () => ctx);
    }
    return ctx as MockContext;
  }

  async mockContextScope(fn: (ctx?: MockContext) => Promise<any>, data?: MockContextData) {
    const ctx = this.mockContext(data, {
      mockCtxStorage: false,
      reuseCtxStorage: false,
    });
    return await this.ctxStorage.run(ctx as any, async () => {
      return await fn(ctx);
    });
  }

  /**
   * mock cookie session
   * @function App#mockSession
   * @param {Object} data - session object
   */
  mockSession(data: any) {
    if (!data) {
      return this;
    }

    if (isObject(data) && !('save' in data)) {
      // keep session.save() work
      Object.defineProperty(data, 'save', {
        value: () => {},
        enumerable: false,
      });
    }
    mock(this.context, 'session', data);
    return this;
  }

  /**
   * Mock service
   * @function App#mockService
   * @param {String} service - name
   * @param {String} methodName - method
   * @param {Object|Function|Error} fn - mock you data
   */
  mockService(service: string | any, methodName: string, fn: any) {
    if (typeof service === 'string') {
      const splits = service.split('.');
      service = this.serviceClasses;
      for (const key of splits) {
        service = service[key];
      }
      service = service.prototype || service;
    }
    this._mockFn(service, methodName, fn);
    return this;
  }

  /**
   * mock service that return error
   * @function App#mockServiceError
   * @param {String} service - name
   * @param {String} methodName - method
   * @param {Error} [err] - error information
   */
  mockServiceError(service: string | any, methodName: string, err?: string | Error) {
    if (typeof err === 'string') {
      err = new Error(err);
    }
    if (!err) {
      // mockServiceError(service, methodName)
      err = new Error(`mock ${methodName} error`);
    }
    this.mockService(service, methodName, err);
    return this;
  }

  _mockFn(obj: any, name: string, data: any) {
    const origin = obj[name];
    assert(typeof origin === 'function', `property ${name} in original object must be function`);

    // keep origin properties' type to support mock multi times
    if (!obj[ORIGIN_TYPES]) obj[ORIGIN_TYPES] = {};
    let type = obj[ORIGIN_TYPES][name];
    if (!type) {
      type = obj[ORIGIN_TYPES][name] = isAsyncFunction(origin) ? 'async' : 'sync';
    }

    if (typeof data === 'function') {
      const fn = data;
      // if original is async function
      // but the mock function is normal function, need to change it return a promise
      if (type === 'async' && !isAsyncFunction(fn)) {
        mock(obj, name, function(this: any, ...args: any[]) {
          return new Promise(resolve => {
            resolve(fn.apply(this, args));
          });
        });
        return;
      }

      mock(obj, name, fn);
      return;
    }

    if (type === 'async') {
      mock(obj, name, () => {
        return new Promise((resolve, reject) => {
          if (data instanceof Error) return reject(data);
          resolve(data);
        });
      });
      return;
    }

    mock(obj, name, () => {
      if (data instanceof Error) {
        throw data;
      }
      return data;
    });
  }

  /**
   * mock request
   * @function App#mockRequest
   * @param {Request} req - mock request
   */
  mockRequest(req: MockContextData) {
    req = { ...req };
    const headers = req.headers ?? {};
    for (const key in req.headers) {
      headers[key.toLowerCase()] = req.headers[key];
    }
    if (!headers['x-forwarded-for']) {
      headers['x-forwarded-for'] = '127.0.0.1';
    }
    headers['x-mock-request-from'] = '@eggjs/mock';
    req.headers = headers;
    mergeDescriptors(req, {
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
    });
    return req as IncomingMessage;
  }

  /**
   * mock cookies
   * @function App#mockCookies
   */
  mockCookies(cookies: Record<string, string | string[]>) {
    if (!cookies) {
      return this;
    }
    const createContext = this.createContext;
    mock(this, 'createContext', function(this: any, req: any, res: any) {
      const ctx = createContext.call(this, req, res);
      const getCookie = ctx.cookies.get;
      mock(ctx.cookies, 'get', function(this: any, key: string, opts: any) {
        if (cookies[key]) {
          return cookies[key];
        }
        return getCookie.call(this, key, opts);
      });
      return ctx;
    });
    return this;
  }

  /**
   * mock header
   * @function App#mockHeaders
   */
  mockHeaders(headers: Record<string, string | string[]>) {
    if (!headers) {
      return this;
    }
    const getHeader = this.request.get;
    mock(this.request, 'get', function(this: unknown, field: string) {
      const value = findHeaders(headers, field);
      if (value) return value;
      return getHeader.call(this, field);
    });
    return this;
  }

  /**
   * mock csrf
   * @function App#mockCsrf
   * @since 1.11
   */
  mockCsrf() {
    mock(this.context, 'assertCSRF', () => {});
    mock(this.context, 'assertCsrf', () => {});
    return this;
  }

  /**
   * mock httpclient
   * @alias mockHttpClient
   * @function App#mockHttpclient
   */
  mockHttpclient(mockUrl: string | RegExp, mockMethod: string | string[] | MockResultOptions | MockResultFunction, mockResult?: MockResultOptions | MockResultFunction | string) {
    return this.mockHttpClient(mockUrl, mockMethod, mockResult);
  }

  /**
   * mock httpclient
   * @function App#mockHttpClient
   */
  mockHttpClient(mockUrl: string | RegExp, mockMethod: string | string[] | MockResultOptions | MockResultFunction, mockResult?: MockResultOptions | MockResultFunction | string) {
    if (!this._mockHttpClient) {
      this._mockHttpClient = createMockHttpClient(this);
    }
    this._mockHttpClient(mockUrl, mockMethod, mockResult);
    return this;
  }

  /**
   * @deprecated Please use app.mockHttpClient instead of app.mockUrllib
   */
  mockUrllib(mockUrl: string | RegExp, mockMethod: string | string[] | MockResultOptions | MockResultFunction, mockResult?: MockResultOptions | MockResultFunction | string) {
    this.deprecate('[@eggjs/mock] Please use app.mockHttpClient instead of app.mockUrllib');
    return this.mockHttpClient(mockUrl, mockMethod, mockResult);
  }

  /**
   * get mock httpclient agent
   * @function App#mockHttpclientAgent
   */
  mockAgent() {
    return getMockAgent(this);
  }

  async mockAgentRestore() {
    await restoreMockAgent();
  }

  /**
   * @see mm#restore
   * @function App#mockRestore
   */
  async mockRestore() {
    await this.mockAgentRestore();
    restore();
  }

  /**
   * @see mm
   * @function App#mm
   */
  get mm() {
    return mock;
  }

  /**
   * override loadAgent
   * @function App#loadAgent
   */
  loadAgent() {}

  /**
   * mock serverEnv
   * @function App#mockEnv
   * @param {String} env - serverEnv
   */
  mockEnv(env: string) {
    mock(this.config, 'env', env);
    mock(this.config, 'serverEnv', env);
    debug('mock env: %o', env);
    return this;
  }

  /**
   * http request helper
   * @function App#httpRequest
   * @return {SupertestRequest} req - supertest request
   * @see https://github.com/visionmedia/supertest
   */
  httpRequest(): EggTestRequest {
    return supertestRequest(this);
  }

  /**
   * collection logger message, then can be use on `expectLog()`
   * @param {String|Logger} [logger] - logger instance, default is `app.logger`
   * @function App#mockLog
   */
  mockLog(logger?: string | Logger) {
    logger = logger ?? this.logger;
    if (typeof logger === 'string') {
      logger = this.getLogger(logger);
    }
    // make sure mock once
    if ('_mockLogs' in logger && logger._mockLogs) return;

    const transport = new Transport(logger.options);
    // https://github.com/eggjs/egg-logger/blob/master/lib/logger.js#L64
    const log = logger.log;
    const mockLogs: string[] = [];
    mock(logger, '_mockLogs', mockLogs);
    mock(logger, 'log', (level: LoggerLevel, args: any[], meta: LoggerMeta) => {
      const message = transport.log(level, args, meta);
      mockLogs.push(message);
      log.apply(logger, [ level, args, meta ]);
    });
  }

  __checkExpectLog(expectOrNot: boolean, str: string | RegExp, logger?: string | Logger) {
    logger = logger || this.logger;
    if (typeof logger === 'string') {
      logger = this.getLogger(logger);
    }
    const filepath = logger.options.file;
    let content;
    if ('_mockLogs' in logger && logger._mockLogs) {
      content = (logger._mockLogs as string[]).join('\n');
    } else {
      content = fs.readFileSync(filepath, 'utf8');
    }
    let match;
    let type;
    if (str instanceof RegExp) {
      match = str.test(content);
      type = 'RegExp';
    } else {
      match = content.includes(String(str));
      type = 'String';
    }
    if (expectOrNot) {
      assert(match,
        `Can't find ${type}:"${str}" in ${filepath}, log content: ...${content.substring(content.length - 500)}`);
    } else {
      assert(!match,
        `Find ${type}:"${str}" in ${filepath}, log content: ...${content.substring(content.length - 500)}`);
    }
  }

  /**
   * expect str/regexp in the logger, if your server disk is slow, please call `mockLog()` first.
   * @param {String|RegExp} str - test str or regexp
   * @param {String|Logger} [logger] - logger instance, default is `ctx.logger`
   * @function App#expectLog
   */
  expectLog(str: string | RegExp, logger?: string | Logger) {
    this.__checkExpectLog(true, str, logger);
  }

  /**
   * not expect str/regexp in the logger, if your server disk is slow, please call `mockLog()` first.
   * @param {String|RegExp} str - test str or regexp
   * @param {String|Logger} [logger] - logger instance, default is `ctx.logger`
   * @function App#notExpectLog
   */
  notExpectLog(str: string | RegExp, logger?: string | Logger) {
    this.__checkExpectLog(false, str, logger);
  }

  async backgroundTasksFinished() {
    const tasks = this._backgroundTasks;
    debug('waiting %d background tasks', tasks.length);
    if (tasks.length === 0) return;

    this._backgroundTasks = [];
    await Promise.all(tasks);
    debug('finished %d background tasks', tasks.length);
    if (this._backgroundTasks.length) {
      debug('new background tasks created: %s', this._backgroundTasks.length);
      await this.backgroundTasksFinished();
    }
  }

  get _backgroundTasks() {
    if (!this[BACKGROUND_TASKS]) {
      this[BACKGROUND_TASKS] = [];
    }
    return this[BACKGROUND_TASKS] as Promise<any>[];
  }

  set _backgroundTasks(tasks) {
    this[BACKGROUND_TASKS] = tasks;
  }
}

function findHeaders(headers: Record<string, any>, key: string) {
  if (!headers || !key) {
    return null;
  }
  key = key.toLowerCase();
  for (const headerKey in headers) {
    if (key === headerKey.toLowerCase()) {
      return headers[headerKey];
    }
  }
  return null;
}
