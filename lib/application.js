'use strict';

const path = require('path');
const fs = require('fs');
const ms = require('ms');
const graceful = require('graceful');
const cluster = require('cluster-client');
const onFinished = require('on-finished');
const { assign } = require('utility');
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

  onClientError(err, socket) {
    this.logger.error('A client (%s:%d) error [%s] occurred: %s',
      socket.remoteAddress,
      socket.remotePort,
      err.code,
      err.message);

    // because it's a raw socket object, we should return the raw HTTP response
    // packet.
    socket.end(DEFAULT_BAD_REQUEST_RESPONSE);
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
   * Run generator function in the background
   * @see Context#runInBackground
   * @param {Generator} scope - generator function, the first args is an anonymous ctx
   */
  runInBackground(scope) {
    const ctx = this.createAnonymousContext();
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
