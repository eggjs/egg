/**
 * 对 koa application 的所有扩展，都放在此文件统一维护。
 *
 * - koa application: https://github.com/koajs/koa/blob/master/lib/application.js
 */

'use strict';

const path = require('path');
const graceful = require('graceful');
const http = require('http');
const assert = require('assert');
const EggApplication = require('./egg');
const AppWorkerLoader = require('./loader').AppWorkerLoader;
const view = require('./core/view');
const util = require('./core/util');

const KEYS = Symbol('Application#keys');
const VIEW = Symbol('Application#View');
const HELPER = Symbol('Application#Helper');
const LOCALS = Symbol('Application#locals');
const LOCALS_LIST = Symbol('Application#localsList');
const EGG_LOADER = Symbol.for('egg#loader');
const EGG_PATH = Symbol.for('egg#eggPath');
const EGG_VIEW = Symbol.for('egg#view');

/**
 * Singleton instance in App Worker, extend {@link EggApplication}
 * @extends EggApplication
 */
class Application extends EggApplication {

  /**
   * @constructor
   * @param {Object} options - see {@link EggApplication}
   */
  constructor(options) {
    options = options || {};
    options.type = 'application';
    super(options);
    this.loader.load();
    this.on('server', server => this.onServer(server));
  }

  get [EGG_LOADER]() {
    return AppWorkerLoader;
  }

  get [EGG_PATH]() {
    return path.join(__dirname, '..');
  }

  onServer(server) {
    graceful({
      server: [ server ],
      error: (err, throwErrorCount) => {
        if (err.message) {
          err.message += ' (uncaughtException throw ' + throwErrorCount + ' times on pid:' + process.pid + ')';
        }
        this.coreLogger.error(err);
      },
    });
  }

  /**
   * global locals for view
   * @member {Object} Application#locals
   * @see Context#locals
   */
  get locals() {
    if (!this[LOCALS]) {
      this[LOCALS] = {};
    }
    if (this[LOCALS_LIST] && this[LOCALS_LIST].length) {
      util.assign(this[LOCALS], this[LOCALS_LIST]);
      this[LOCALS_LIST] = null;
    }
    return this[LOCALS];
  }

  set locals(val) {
    if (!this[LOCALS_LIST]) {
      this[LOCALS_LIST] = [];
    }
    this[LOCALS_LIST].push(val);
  }


  /**
   * Create egg context
   * @method Application#createContext
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
    return context;
  }

  /**
   * Create an anonymouse context, the context isn't request level, so the request is mocked.
   * then you can use context level API like `ctx.service`
   * @member {String} Application#createAnonymousContext
   * @param {Request} req - if you want to mock request like querystring, you can pass an object to this function.
   * @return {Context} context
   */
  createAnonymousContext(req) {
    const request = {
      headers: {
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
   * secret key for Application
   * @member {String} Application#keys
   */
  get keys() {
    if (!this[KEYS]) {
      if (!this.config.keys) {
        if (this.config.env === 'local' || this.config.env === 'unittest') {
          console.warn('Please set config.keys first, now using mock keys for dev env (%s)',
            this.config.baseDir);
          this.config.keys = 'foo, keys, you need to set your app keys';
        } else {
          throw new Error('Please set config.keys first');
        }
      }

      this[KEYS] = this.config.keys.split(',').map(s => s.trim());
    }
    return this[KEYS];
  }

  /**
   * The view class
   * @member {View} Application#View
   * @private
   */
  get View() {
    if (!this[VIEW]) {
      assert(this[EGG_VIEW], 'should enable view plugin');
      this[VIEW] = view(this[EGG_VIEW]);
    }
    return this[VIEW];
  }

  /**
   * The helper class, `app/helper` will be loaded to it's prototype,
   * then you can use all method on `ctx.helper`
   * @member {Helper} Application#Helper
   */
  get Helper() {
    if (!this[HELPER]) {
      this[HELPER] = class Helper extends this.BaseContextClass {};
    }
    return this[HELPER];
  }

}

module.exports = Application;
