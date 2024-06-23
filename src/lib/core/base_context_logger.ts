import { type EggCoreContext } from '@eggjs/core';

const CALL = Symbol('BaseContextLogger#call');

export class BaseContextLogger {
  readonly #ctx: EggCoreContext;
  readonly #pathName?: string;

  /**
   * @class
   * @param {Context} ctx - context instance
   * @param {String} pathName - class path name
   * @since 1.0.0
   */
  constructor(ctx: EggCoreContext, pathName?: string) {
    /**
     * @member {Context} BaseContextLogger#ctx
     * @since 1.2.0
     */
    this.#ctx = ctx;
    this.#pathName = pathName;
  }

  [CALL](method: string, args: any[]) {
    // add `[${pathName}]` in log
    if (this.#pathName && typeof args[0] === 'string') {
      args[0] = `[${this.#pathName}] ${args[0]}`;
    }
    this.#ctx.app.logger[method](...args);
  }

  /**
   * @member {Function} BaseContextLogger#debug
   * @param {...any} args - log msg
   * @since 1.2.0
   */
  debug(...args: any[]) {
    this[CALL]('debug', args);
  }

  /**
   * @member {Function} BaseContextLogger#info
   * @param {...any} args - log msg
   * @since 1.2.0
   */
  info(...args: any[]) {
    this[CALL]('info', args);
  }

  /**
   * @member {Function} BaseContextLogger#warn
   * @param {...any} args - log msg
   * @since 1.2.0
   */
  warn(...args: any[]) {
    this[CALL]('warn', args);
  }

  /**
   * @member {Function} BaseContextLogger#error
   * @param {...any} args - log msg
   * @since 1.2.0
   */
  error(...args: any[]) {
    this[CALL]('error', args);
  }
}
