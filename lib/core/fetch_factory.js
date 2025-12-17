const debug = require('util').debuglog('egg:lib:core:fetch_factory');
const { detectFetchVersion } = require('./utils');

let FetchFactory;
let ssrfFetchFactory;

/**
  * do not call this function multiple times in one app instance
  * @param {ClientOptions} options https://github.com/node-modules/urllib/blob/master/src/HttpClient.ts
  * @param {*} config egg config
  * @return { fetch: FetchFunction, safeFetch: SafeFetchFunction }
  */
function createFetchInstances(options = {}, config = {}) {
  if (detectFetchVersion()) {
    // urllib@4 only works on Node.js >= 20
    try {
      if (!FetchFactory) {
        const urllib4 = require('urllib4');
        FetchFactory = urllib4.FetchFactory;
        debug('urllib4 enable');
      }
      FetchFactory.setClientOptions({ ...options });
      const fetch = FetchFactory.fetch;

      if (!ssrfFetchFactory) {
        ssrfFetchFactory = new FetchFactory();
      }
      const safeFetch = function safeFetch(url, init) {
        const ssrfConfig = config.security?.ssrf;
        const clientOptions = { ...options };
        if (ssrfConfig?.checkAddress) {
          clientOptions.checkAddress = ssrfConfig.checkAddress;
        } else {
          this.logger.warn('[egg-security] please configure `config.security.ssrf` first');
        }
        ssrfFetchFactory.setClientOptions(clientOptions);
        return ssrfFetchFactory.fetch(url, init);
      };

      return {
        fetch,
        safeFetch,
      };
    } catch (err) {
      debug('require urllib4 error: %s', err);
      return {};
    }
  } else {
    return {};
  }
}

module.exports = {
  createFetchInstances,
};
