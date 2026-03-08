const debug = require("node:util").debuglog("egg:lib:core:fetch_factory");

const mainNodejsVersion = parseInt(process.versions.node.split(".")[0]);
let FetchFactory;
let fetch;
// Track initialization per app instance by storing a WeakMap
const fetchInitializedMap = new WeakMap();
let safeFetch;
let ssrfFetchFactory;

if (mainNodejsVersion >= 20) {
  // urllib@4 only works on Node.js >= 20
  try {
    const urllib4 = require("urllib4");
    FetchFactory = urllib4.FetchFactory;
    debug("urllib4 enable");

    fetch = function (url, init) {
      if (!fetchInitializedMap.get(this)) {
        const clientOptions = {};
        if (this.config.httpclient?.lookup) {
          clientOptions.lookup = this.config.httpclient.lookup;
        }
        FetchFactory.setClientOptions(clientOptions);

        // Support custom interceptors via dispatcher.compose
        // Must be set after setClientOptions because setClientOptions resets dispatcher
        // interceptors is an array of interceptor functions that follow undici's dispatcher API(undici have not supported clientOptions.interceptors natively yet)
        if (this.config.httpclient?.interceptors) {
          const interceptors = this.config.httpclient.interceptors;
          const originalDispatcher = FetchFactory.getDispatcher();
          FetchFactory.setDispatcher(originalDispatcher.compose(interceptors));
        }

        fetchInitializedMap.set(this, true);
      }
      return FetchFactory.fetch(url, init);
    };

    safeFetch = function safeFetch(url, init) {
      if (!ssrfFetchFactory) {
        const ssrfConfig = this.config.security?.ssrf;
        const clientOptions = {};
        if (ssrfConfig?.checkAddress) {
          clientOptions.checkAddress = ssrfConfig.checkAddress;
        } else {
          this.logger.warn("[egg-security] please configure `config.security.ssrf` first");
        }
        if (this.config.httpclient?.lookup) {
          clientOptions.lookup = this.config.httpclient.lookup;
        }
        ssrfFetchFactory = new FetchFactory();
        ssrfFetchFactory.setClientOptions(clientOptions);

        if (this.config.httpclient?.interceptors) {
          const interceptors = this.config.httpclient.interceptors;
          const originalDispatcher = ssrfFetchFactory.getDispatcher();
          ssrfFetchFactory.setDispatcher(originalDispatcher.compose(interceptors));
        }
      }
      return ssrfFetchFactory.fetch(url, init);
    };
  } catch (err) {
    debug("require urllib4 error: %s", err);
  }
}

module.exports = {
  FetchFactory,
  safeFetch,
  fetch,
};
