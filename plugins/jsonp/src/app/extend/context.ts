import { jsonp as jsonpBody } from 'jsonp-body';
import { Context } from '@eggjs/core';
import { JSONP_CONFIG } from '../../lib/private_key.js';

export default class JSONPContext extends Context {
  /**
   * detect if response should be jsonp
   */
  get acceptJSONP() {
    const jsonpConfig = Reflect.get(this, JSONP_CONFIG) as any;
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
    const jsonpConfig = Reflect.get(this, JSONP_CONFIG) as any;
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
