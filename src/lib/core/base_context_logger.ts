import type { EggApplicationContext } from '../egg.js';

export class BaseContextLogger {
  readonly #ctx: EggApplicationContext;
  readonly #pathName?: string;

  /**
   * @class
   * @param {Context} ctx - context instance
   * @param {String} pathName - class path name
   * @since 1.0.0
   */
  constructor(ctx: EggApplicationContext, pathName?: string) {
    /**
     * @member {Context} BaseContextLogger#ctx
     * @since 1.2.0
     */
    this.#ctx = ctx;
    this.#pathName = pathName;
  }

  protected _log(method: string, args: any[]) {
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
    this._log('debug', args);
  }

  /**
   * @member {Function} BaseContextLogger#info
   * @param {...any} args - log msg
   * @since 1.2.0
   */
  info(...args: any[]) {
    this._log('info', args);
  }

  /**
   * @member {Function} BaseContextLogger#warn
   * @param {...any} args - log msg
   * @since 1.2.0
   */
  warn(...args: any[]) {
    this._log('warn', args);
  }

  /**
   * @member {Function} BaseContextLogger#error
   * @param {...any} args - log msg
   * @since 1.2.0
   */
  error(...args: any[]) {
    this._log('error', args);
  }
}
