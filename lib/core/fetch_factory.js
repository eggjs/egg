const debug = require('util').debuglog('egg:lib:core:httpclient_next');

const mainNodejsVersion = parseInt(process.versions.node.split('.')[0]);
let FetchFactory;
let safeFetch;
let ssrfFetchFactory;

if (mainNodejsVersion >= 18) {
  // urllib@4 only works on Node.js >= 18
  try {
    const urllib4 = require('urllib4');
    FetchFactory = urllib4.FetchFactory;
    debug('urllib4 enable');

    safeFetch = function safeFetch(url, init) {
      if (!ssrfFetchFactory) {
        const ssrfConfig = this.config.security.ssrf;
        const clientOptions = {};
        if (ssrfConfig?.checkAddress) {
          clientOptions.checkAddress = ssrfConfig.checkAddress;
        } else {
          this.logger.warn('[egg-security] please configure `config.security.ssrf` first');
        }
        ssrfFetchFactory = new FetchFactory();
        ssrfFetchFactory.setClientOptions(clientOptions);
      }
      return ssrfFetchFactory.fetch(url, init);
    };
  } catch (err) {
    debug('require urllib4 error: %s', err);
  }
}

module.exports = {
  FetchFactory,
  safeFetch,
};
