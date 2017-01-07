'use strict';

const RegistryClient = require('./lib/registry_client');

module.exports = function(agent) {
  const done = agent.readyCallback('register_client', {
    isWeakDep: agent.config.runMode === 0,
  });
  agent.registryClient = agent.cluster(RegistryClient).create();
  agent.registryClient.ready(done);
};
