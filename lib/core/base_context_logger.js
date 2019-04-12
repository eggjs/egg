'use strict';

const CALL = Symbol('BaseContextLogger#call');

class BaseContextLogger {

  /**
   * @constructor
   * @param {Context} ctx - context instance
   * @param {String} pathName - class path name
   * @since 1.0.0
   */
  constructor(ctx, pathName) {
    /**
     * @member {Context} BaseContextLogger#ctx
     * @since 1.2.0
     */
    this.ctx = ctx;
    this.pathName = pathName;
  }

  [CALL](method, args) {
    // add `[${pathName}]` in log
    if (this.pathName && typeof args[0] === 'string') {
      args[0] = `[${this.pathName}] ${args[0]}`;
    }
    this.ctx.logger[method](...args);
  }

  /**
   * @member {Function} BaseContextLogger#debug
   * @since 1.2.0
   */
  debug(...args) {
    this[CALL]('debug', args);
  }

  /**
   * @member {Function} BaseContextLogger#info
   * @since 1.2.0
   */
  info(...args) {
    this[CALL]('info', args);
  }

  /**
   * @member {Function} BaseContextLogger#warn
   * @since 1.2.0
   */
  warn(...args) {
    this[CALL]('warn', args);
  }

  /**
   * @member {Function} BaseContextLogger#error
   * @since 1.2.0
   */
  error(...args) {
    this[CALL]('error', args);
  }
}

module.exports = BaseContextLogger;
