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
   * @class
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
    /* istanbul ignore next */
    if (!socket.writable) return;
    if (!raw) return socket.end(DEFAULT_BAD_REQUEST_RESPONSE);

    const body = (raw.body == null) ? DEFAULT_BAD_REQUEST_HTML : raw.body;
    const headers = raw.headers || {};
    const status = raw.status || 400;

    let responseHeaderLines = '';
    const firstLine = `HTTP/1.1 ${status} ${http.STATUS_CODES[status] || 'Unknown'}`;

    // Not that safe because no validation for header keys.
    // Refs: https://github.com/nodejs/node/blob/b38c81/lib/_http_outgoing.js#L451
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() === 'content-length') {
        delete headers[key];
        continue;
      }
      responseHeaderLines += `${key}: ${escapeHeaderValue(headers[key])}\r\n`;
    }

    responseHeaderLines += `Content-Length: ${Buffer.byteLength(body)}\r\n`;

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

      // the returned object should be something like:
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

  onServer(server) {
    // expose app.server
    this.server = server;
    // set ignore code
    const serverGracefulIgnoreCode = this.config.serverGracefulIgnoreCode || [];

    /* istanbul ignore next */
    graceful({
      server: [ server ],
      error: (err, throwErrorCount) => {
        const originMessage = err.message;
        if (originMessage) {
          // shouldjs will override error property but only getter
          // https://github.com/shouldjs/should.js/blob/889e22ebf19a06bc2747d24cf34b25cc00b37464/lib/assertion-error.js#L26
          Object.defineProperty(err, 'message', {
            get() {
              return originMessage + ' (uncaughtException throw ' + throwErrorCount + ' times on pid:' + process.pid + ')';
            },
            configurable: true,
            enumerable: false,
          });
        }
        this.coreLogger.error(err);
      },
      ignoreCode: serverGracefulIgnoreCode,
    });

    server.on('clientError', (err, socket) => this.onClientError(err, socket));

    // server timeout
    if (is.number(this.config.serverTimeout)) server.setTimeout(this.config.serverTimeout);
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

  handleRequest(ctx, fnMiddleware) {
    this.emit('request', ctx);
    onFinished(ctx.res, () => this.emit('response', ctx));
    return super.handleRequest(ctx, fnMiddleware);
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

  set keys(_) {
    // ignore
  }

  /**
   * reference to {@link Helper}
   * @member {Helper} Application#Helper
   */
  get Helper() {
    if (!this[HELPER]) {
      /**
       * The Helper class which can be used as utility function.
       * We support developers to extend Helper through ${baseDir}/app/extend/helper.js ,
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
