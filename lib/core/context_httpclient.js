'use strict';

class ContextHttpClient {
  constructor(ctx) {
    this.ctx = ctx;
    this.app = ctx.app;
  }

  /**
   * http request helper base on {@link HttpClient}, it will auto save httpclient log.
   * Keep the same api with {@link Application#curl}.
   *
   * @param {String|Object} url - request url address.
   * @param {Object} [options] - options for request.
   * @return {Object} see {@link Application#curl}
   */
  curl(url, options) {
    options = options || {};
    options.ctx = this.ctx;
    return this.app.curl(url, options);
  }

  request(url, options) {
    return this.curl(url, options);
  }
}

module.exports = ContextHttpClient;
