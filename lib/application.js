'use strict';

const path = require('path');
const fs = require('fs');
const ms = require('ms');
const is = require('is-type-of');
const graceful = require('graceful');
const http = require('http');
const cluster = require('cluster-client');
const onFinished = require('on-finished');
const { assign } = require('utility');
const eggUtils = require('egg-core').utils;
const EggApplication = require('./egg');
const AppWorkerLoader = require('./loader').AppWorkerLoader;

const KEYS = Symbol('Application#keys');
const HELPER = Symbol('Application#Helper');
const LOCALS = Symbol('Application#locals');
const BIND_EVENTS = Symbol('Application#bindEvents');
const WARN_CONFUSED_CONFIG = Symbol('Application#warnConfusedConfig');
const EGG_LOADER = Symbol.for('egg#loader');
const EGG_PATH = Symbol.for('egg#eggPath');
const CLUSTER_CLIENTS = Symbol.for('egg#clusterClients');
const RESPONSE_RAW = Symbol('Application#responseRaw');

// client error => 400 Bad Request
// Refs: https://nodejs.org/dist/latest-v8.x/docs/api/http.html#http_event_clienterror
const DEFAULT_BAD_REQUEST_HTML = `<html>
  <head><title>400 Bad Request</title></head>
  <body bgcolor="white">
  <center><h1>400 Bad Request</h1></center>
  <hr><center>❤</center>
  </body>
  </html>`;
const DEFAULT_BAD_REQUEST_HTML_LENGTH = Buffer.byteLength(DEFAULT_BAD_REQUEST_HTML);
const DEFAULT_BAD_REQUEST_RESPONSE =
  `HTTP/1.1 400 Bad Request\r\nContent-Length: ${DEFAULT_BAD_REQUEST_HTML_LENGTH}` +
  `\r\n\r\n${DEFAULT_BAD_REQUEST_HTML}`;

// Refs: https://github.com/nodejs/node/blob/b38c81/lib/_http_outgoing.js#L706-L710
function escapeHeaderValue(value) {
  // Protect against response splitting. The regex test is there to
  // minimize the performance impact in the common case.
  return /[\r\n]/.test(value) ? value.replace(/[\r\n]+[ \t]*/g, '') : value;
}

// Refs: https://github.com/nodejs/node/blob/b38c81/lib/_http_outgoing.js#L706-L710
/**
 * Singleton instance in App Worker, extend {@link EggApplication}
 * @extends EggApplication
 */
class Application extends EggApplication {

  /**
   * @constructor
   * @param {Object} options - see {@link EggApplication}
   */
  constructor(options = {}) {
    options.type = 'application';
    super(options);

    // will auto set after 'server' event emit
    this.server = null;

    try {
      this.loader.load();
    } catch (e) {
      // close gracefully
      this[CLUSTER_CLIENTS].forEach(cluster.close);
      throw e;
    }

    // dump config after loaded, ensure all the dynamic modifications will be recorded
    const dumpStartTime = Date.now();
    this.dumpConfig();
    this.coreLogger.info('[egg:core] dump config after load, %s', ms(Date.now() - dumpStartTime));

    this[WARN_CONFUSED_CONFIG]();
    this[BIND_EVENTS]();
  }

  get [EGG_LOADER]() {
    return AppWorkerLoader;
  }

  get [EGG_PATH]() {
    return path.join(__dirname, '..');
  }

  [RESPONSE_RAW](socket, raw) {
    if (!socket.writable) return;
    if (!raw) return socket.end(DEFAULT_BAD_REQUEST_RESPONSE);

    let body = (raw.body == null) ? DEFAULT_BAD_REQUEST_HTML : raw.body;
    const headers = raw.headers || {};
    const status = raw.status || 400;

    let responseHeaderLines = '';
    let lengthOutputed = false;
    const firstLine = `HTTP/1.1 ${status} ${http.STATUS_CODES[status] || 'Unknown'}`;

    // Not that safe because no validation for header keys.
    // Refs: https://github.com/nodejs/node/blob/b38c81/lib/_http_outgoing.js#L451
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() === 'content-length') lengthOutputed = true;
      responseHeaderLines += `${key}: ${escapeHeaderValue(headers[key])}\r\n`;
    }

    if (!lengthOutputed) {
      if (!Buffer.isBuffer(body)) body = Buffer.from(body);
      responseHeaderLines += `Content-Length: ${body.byteLength}\r\n`;
    }

    socket.end(`${firstLine}\r\n${responseHeaderLines}\r\n${body.toString()}`);
  }

  onClientError(err, socket) {
    // ignore when there is no http body, it almost like an ECONNRESET
    if (err.rawPacket) {
      this.logger.warn('A client (%s:%d) error [%s] occurred: %s',
        socket.remoteAddress,
        socket.remotePort,
        err.code,
        err.message);
    }

    if (typeof this.config.onClientError === 'function') {
      const p = eggUtils.callFn(this.config.onClientError, [ err, socket, this ]);

      // the returned object should like:
      //
      //   {
      //     body: '...',
      //     headers: {
      //       ...
      //     },
      //     status: 400
      //   }
      //
      // default values:
      //
      // + body: ''
      // + headers: {}
      // + status: 400
      p.then(ret => {
        this[RESPONSE_RAW](socket, ret || {});
      }).catch(err => {
        this.logger.error(err);
        this[RESPONSE_RAW](socket);
      });
    } else {
      // because it's a raw socket object, we should return the raw HTTP response
      // packet.
      this[RESPONSE_RAW](socket);
    }
  }

  _onServerTimeout(socket) {
    const req = socket.parser.incoming;
    if (req) {
      this.coreLogger.warn('[http_server] A request `%s %s` timeout with client (%s:%d)', req.method, req.url, socket.remoteAddress, socket.remotePort);
    }
    socket.destroy();
  }

  onServer(server) {
    // expose app.server
    this.server = server;

    /* istanbul ignore next */
    graceful({
      server: [ server ],
      error: (err, throwErrorCount) => {
        if (err.message) {
          err.message += ' (uncaughtException throw ' + throwErrorCount + ' times on pid:' + process.pid + ')';
        }
        this.coreLogger.error(err);
      },
    });

    server.on('clientError', (err, socket) => this.onClientError(err, socket));

    // server timeout
    if (is.number(this.config.serverTimeout)) server.setTimeout(this.config.serverTimeout);
    server.on('timeout', socket => this._onServerTimeout(socket));
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
    return this[LOCALS];
  }

  set locals(val) {
    if (!this[LOCALS]) {
      this[LOCALS] = {};
    }

    assign(this[LOCALS], val);
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

  handleRequest(ctx, fnMiddleware) {
    this.emit('request', ctx);
    super.handleRequest(ctx, fnMiddleware);
    onFinished(ctx.res, () => this.emit('response', ctx));
  }

  /**
   * save routers to `run/router.json`
   * @private
   */
  dumpConfig() {
    super.dumpConfig();

    // dump routers to router.json
    const rundir = this.config.rundir;
    const FULLPATH = this.loader.FileLoader.FULLPATH;
    try {
      const dumpRouterFile = path.join(rundir, 'router.json');
      const routers = [];
      for (const layer of this.router.stack) {
        routers.push({
          name: layer.name,
          methods: layer.methods,
          paramNames: layer.paramNames,
          path: layer.path,
          regexp: layer.regexp.toString(),
          stack: layer.stack.map(stack => stack[FULLPATH] || stack._name || stack.name || 'anonymous'),
        });
      }
      fs.writeFileSync(dumpRouterFile, JSON.stringify(routers, null, 2));
    } catch (err) {
      this.coreLogger.warn(`dumpConfig router.json error: ${err.message}`);
    }
  }

  /**
   * Create an anonymous context, the context isn't request level, so the request is mocked.
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
   * Run async function in the background
   * @see Context#runInBackground
   * @param {Function} scope - the first args is an anonymous ctx
   */
  runInBackground(scope) {
    const ctx = this.createAnonymousContext();
    if (!scope.name) scope._name = eggUtils.getCalleeFromStack(true);
    ctx.runInBackground(scope);
  }

  /**
   * secret key for Application
   * @member {String} Application#keys
   */
  get keys() {
    if (!this[KEYS]) {
      if (!this.config.keys) {
        if (this.config.env === 'local' || this.config.env === 'unittest') {
          const configPath = path.join(this.config.baseDir, 'config/config.default.js');
          console.error('Cookie need secret key to sign and encrypt.');
          console.error('Please add `config.keys` in %s', configPath);
        }
        throw new Error('Please set config.keys first');
      }

      this[KEYS] = this.config.keys.split(',').map(s => s.trim());
    }
    return this[KEYS];
  }

  /**
   * reference to {@link Helper}
   * @member {Helper} Application#Helper
   */
  get Helper() {
    if (!this[HELPER]) {
      /**
       * The Helper class which can be used as utility function.
       * Files from `${baseDir}/app/helper` will be loaded to the prototype of Helper,
       * then you can use all method on `ctx.helper` that is a instance of Helper.
       */
      class Helper extends this.BaseContextClass {}
      this[HELPER] = Helper;
    }
    return this[HELPER];
  }

  /**
   * bind app's events
   *
   * @private
   */
  [BIND_EVENTS]() {
    // Browser Cookie Limits: http://browsercookielimits.squawky.net/
    this.on('cookieLimitExceed', ({ name, value, ctx }) => {
      const err = new Error(`cookie ${name}'s length(${value.length}) exceed the limit(4093)`);
      err.name = 'CookieLimitExceedError';
      err.key = name;
      err.cookie = value;
      ctx.coreLogger.error(err);
    });
    // expose server to support websocket
    this.once('server', server => this.onServer(server));
  }

  /**
   * warn when confused configurations are present
   *
   * @private
   */
  [WARN_CONFUSED_CONFIG]() {
    const confusedConfigurations = this.config.confusedConfigurations;
    Object.keys(confusedConfigurations).forEach(key => {
      if (this.config[key] !== undefined) {
        this.logger.warn('Unexpected config key `%s` exists, Please use `%s` instead.',
          key, confusedConfigurations[key]);
      }
    });
  }
}

module.exports = Application;
