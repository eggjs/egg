'use strict';

const RegistryClient = require('./lib/registry_client');

module.exports = function(app) {
  const done = app.readyCallback('register_client', {
    isWeakDep: app.config.runMode === 0,
  });
  const cluster = app.cluster;
  app.registryClient = cluster(RegistryClient).create();
  app.registryClient.ready(done);

  app.registryClient.subscribe({
    dataId: 'demo.DemoService',
  }, val => {
    app.val = val;
  });
};
