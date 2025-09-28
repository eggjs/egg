import type { MiddlewareFunc } from 'egg';

import type { JSONPConfig } from './config/config.default.ts';

declare module 'egg' {
  // add EggAppConfig overrides types
  interface EggAppConfig {
    /**
     * jsonp options
     * @member Config#jsonp
     */
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

  interface Application {
    /**
     * return a middleware to enable jsonp response.
     * will do some security check inside.
     * @public
     */
    jsonp(initOptions?: Partial<JSONPConfig>): MiddlewareFunc;
  }
}
