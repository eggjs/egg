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

  get [Symbol.for('egg#loader')]() {
    return AppWorkerLoader;
  }

  get [Symbol.for('egg#eggPath')]() {
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
