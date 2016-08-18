/**
 * 对 koa application 的所有扩展，都放在此文件统一维护。
 *
 * - koa application: https://github.com/koajs/koa/blob/master/lib/application.js
 */

'use strict';

const path = require('path');
const graceful = require('graceful');
const EggApplication = require('./egg');
const AppWorkerLoader = require('./loader').AppWorkerLoader;

const EGG_LOADER = Symbol.for('egg#loader');
const EGG_PATH = Symbol.for('egg#eggPath');

/**
 * Application 对象，由 AppWorker 实例化，和 {@link Agent} 共用继承 {@link EggApplication} 的 API
 * @extends EggApplication
 */
class Application extends EggApplication {

  /**
   * @constructor
   * @param {Object} options - 同 {@link EggApplication}
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
}

module.exports = Application;
