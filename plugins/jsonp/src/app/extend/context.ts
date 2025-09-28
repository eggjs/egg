import { jsonp as jsonpBody } from 'jsonp-body';
import { Context } from 'egg';

import { JSONP_CONFIG } from '../../lib/private_key.ts';
import type { JSONPConfig } from '../../config/config.default.ts';

export default class JSONPContext extends Context {
  declare [JSONP_CONFIG]?: {
    jsonpFunction?: string;
    options?: JSONPConfig;
  };

  /**
   * detect if response should be jsonp
   */
  get acceptJSONP() {
    const jsonpConfig = this[JSONP_CONFIG];
    return !!jsonpConfig?.jsonpFunction;
  }

  /**
   * JSONP wrap body function
   * Set jsonp response wrap function, other plugin can use it.
   * If not necessary, please don't use this method in your application code.
   * @param {Object} body response body
   * @private
   */
  createJsonpBody(body: any) {
    const jsonpConfig = this[JSONP_CONFIG];
    if (!jsonpConfig?.jsonpFunction) {
      this.body = body;
      return;
    }

    this.set('x-content-type-options', 'nosniff');
    this.type = 'js';
    body = body === undefined ? null : body;
    // protect from jsonp xss
    this.body = jsonpBody(body, jsonpConfig.jsonpFunction, jsonpConfig.options);
  }
}
