'use strict';

class ContextHttpClient {
  constructor(ctx) {
    this.ctx = ctx;
  }

  /**
   * http request helper base on {@link HttpClient}, it will auto save httpclient log.
   * Keep the same api with {@link Application#curl}.
   *
   * @param {String|Object} url - request url address.
   * @param {Object} [options] - options for request.
   * @return {Object} see {@link Application#curl}
   */
  * curl(url, options) {
    options = options || {};
    options.ctx = this.ctx;
    const method = (options.method || 'GET').toUpperCase();
    const ins = this.ctx.instrument('http', `${method} ${url}`);
    const result = yield this.ctx.app.curl(url, options);
    ins.end();
    return result;
  }

  * request(url, options) {
    return yield this.curl(url, options);
  }
}

module.exports = ContextHttpClient;
