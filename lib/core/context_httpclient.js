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
    return yield this.ctx.app.curl(url, options);
  }

  * request(url, options) {
    return yield this.curl(url, options);
  }
}

module.exports = ContextHttpClient;
