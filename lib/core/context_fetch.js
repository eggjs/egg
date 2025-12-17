class ContextFetch {
  constructor(ctx) {
    this.ctx = ctx;
    this.app = ctx.app;
  }

  /**
   * fetch request helper based on native fetch API or urllib4's FetchFactory
   * Keep the same api with {@link Application#fetch}.
   *
   * @param {String|URL} url - request url address.
   * @param {Object} [init] - fetch init options.
   * @return {Promise<Response>} fetch response
   */
  async fetch(url, init) {
    init = init || {};
    init.ctx = this.ctx;
    return await this.app.fetch(url, init);
  }

  /**
   * safeFetch request helper with SSRF protection
   * Keep the same api with {@link Application#safeFetch}.
   *
   * @param {String|URL} url - request url address.
   * @param {Object} [init] - fetch init options.
   * @return {Promise<Response>} fetch response
   */
  async safeFetch(url, init) {
    init = init || {};
    init.ctx = this.ctx;
    return await this.app.safeFetch(url, init);
  }
}

module.exports = ContextFetch;
