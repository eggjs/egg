'use strict';

const ApiClient = require('./lib/api_client');
const ApiClient2 = require('./lib/api_client_2');
const RegistryClient = require('./lib/registry_client');

module.exports = function(agent) {
  agent.registryClient = agent.cluster(RegistryClient).create();
  agent.apiClient = new ApiClient({
    cluster: agent.cluster,
  });
  agent.apiClient2 = new ApiClient2({
    cluster: agent.cluster,
  });

  agent.beforeStart(function*() {
    yield agent.registryClient.ready();
    yield agent.apiClient.ready();
    yield agent.apiClient2.ready();
  });
};
