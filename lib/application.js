'use strict';

const path = require('path');
const graceful = require('graceful');
const EggApplication = require('./egg');
const AppWorkerLoader = require('./loader').AppWorkerLoader;
const cluster = require('cluster-client');
const { assign } = require('utility');

const KEYS = Symbol('Application#keys');
const HELPER = Symbol('Application#Helper');
const LOCALS = Symbol('Application#locals');
const BIND_EVENTS = Symbol('Application#bindEvents');
const WARN_CONFUSED_CONFIG = Symbol('Application#warnConfusedConfig');
const EGG_LOADER = Symbol.for('egg#loader');
const EGG_PATH = Symbol.for('egg#eggPath');
const CLUSTER_CLIENTS = Symbol.for('egg#clusterClients');

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

    try {
      this.loader.load();
    } catch (e) {
      // close gracefully
      this[CLUSTER_CLIENTS].forEach(cluster.close);
      throw e;
    }

    // dump config after loaded, ensure all the dynamic modifications will be recorded
    this.dumpConfig();
    this[WARN_CONFUSED_CONFIG]();
    this[BIND_EVENTS]();
  }

  get [EGG_LOADER]() {
    return AppWorkerLoader;
  }

  get [EGG_PATH]() {
    return path.join(__dirname, '..');
  }

  onServer(server) {
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
      err.cookie = value;
      ctx.coreLogger.error(err);
    });
    // expose server to support websocket
    this.on('server', server => this.onServer(server));
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
