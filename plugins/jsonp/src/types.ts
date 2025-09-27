import type { MiddlewareFunc } from '@eggjs/core';

/**
 * jsonp options
 * @member Config#jsonp
 */
export interface JSONPConfig {
  /**
   * jsonp callback methods key, default to `['_callback', 'callback' ]`
   */
  callback: string[] | string;
  /**
   * callback method name's max length, default to `50`
   */
  limit: number;
  /**
   * enable csrf check or not, default to `false`
   */
  csrf: boolean;
  /**
   * referrer white list, default to `undefined`
   */
  whiteList?: string | RegExp | (string | RegExp)[];
}

declare module '@eggjs/core' {
  // add EggAppConfig overrides types
  interface EggAppConfig {
    jsonp?: JSONPConfig;
  }

  interface Context {
    /**
     * detect if response should be jsonp
     */
    acceptJSONP: boolean;
    /**
     * JSONP wrap body function
     * Set jsonp response wrap function, other plugin can use it.
     * If not necessary, please don't use this method in your application code.
     * @param {Object} body response body
     * @private
     */
    createJsonpBody(body: any): void;
  }

  interface EggCore {
    /**
     * return a middleware to enable jsonp response.
     * will do some security check inside.
     * @public
     */
    jsonp(initOptions?: Partial<JSONPConfig>): MiddlewareFunc;
  }
}
