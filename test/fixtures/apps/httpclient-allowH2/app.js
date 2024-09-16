const assert = require('assert');

module.exports = app => {
  class CustomHttpClient extends app.HttpClientNext {
    async request(url, opt) {
      assert(/^http/.test(url), 'url should start with http, but got ' + url);
      return await super.request(url, opt);
    }

    async curl(url, opt) {
      return await this.request(url, opt);
    }
  }
  app.HttpClientNext = CustomHttpClient;
};
