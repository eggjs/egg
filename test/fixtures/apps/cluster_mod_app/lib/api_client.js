'use strict';

const APIClientBase = require('cluster-client').APIClientBase;

class ApiClient extends APIClientBase {
  get DataClient() {
    return require('./registry_client');
  }

  get clusterOptions() {
    return {
      name: 'ApiClient',
    };
  }

  async getResponseTimeout() {
    return this._client.options.responseTimeout;
  }
}

module.exports = ApiClient;
