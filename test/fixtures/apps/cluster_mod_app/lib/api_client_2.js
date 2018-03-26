'use strict';

const APIClientBase = require('cluster-client').APIClientBase;

class ApiClient2 extends APIClientBase {
  get DataClient() {
    return require('./registry_client');
  }

  get clusterOptions() {
    return {
      name: 'ApiClient2',
      responseTimeout: 1000,
    };
  }

  async getResponseTimeout() {
    return this._client.options.responseTimeout;
  }
}

module.exports = ApiClient2;
