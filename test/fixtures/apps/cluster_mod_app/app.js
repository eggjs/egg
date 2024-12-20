'use strict';

const ApiClient = require('./lib/api_client');
const ApiClient2 = require('./lib/api_client_2');
const RegistryClient = require('./lib/registry_client');

module.exports = function(app) {
  const cluster = app.cluster;
  app.registryClient = cluster(RegistryClient).create();

  app.registryClient.subscribe({
    dataId: 'demo.DemoService',
  }, val => {
    app.val = val;
  });

  app.apiClient = new ApiClient({ cluster });
  app.apiClient2 = new ApiClient2({ cluster });

  app.beforeStart(async function() {
    await app.registryClient.ready();
    await app.apiClient.ready();
    await app.apiClient2.ready();
  });
};
