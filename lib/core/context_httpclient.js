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
  async curl(url, options) {
    options = options || {};
    options.ctx = this.ctx;
    return await this.app.curl(url, options);
  }

  async request(url, options) {
    return await this.curl(url, options);
  }
}

module.exports = ContextHttpClient;
