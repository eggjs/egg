const assert = require('assert');

module.exports = app => {
  class CustomHttpClient extends app.HttpClientAllowH2 {
    request(url, opt) {
      return new Promise(resolve => {
        assert(/^http/.test(url), 'url should start with http, but got ' + url);
        resolve();
      }).then(() => {
        return super.request(url, opt);
      });
    }

    curl(url, opt) {
      return this.request(url, opt);
    }
  }
  app.HttpClientAllowH2 = CustomHttpClient;
};
