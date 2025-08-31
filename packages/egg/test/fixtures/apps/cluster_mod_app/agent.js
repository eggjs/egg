const ApiClient = require('./lib/api_client');
const ApiClient2 = require('./lib/api_client_2');
const RegistryClient = require('./lib/registry_client');

module.exports = class Boot {
  constructor(agent) {
    this.agent = agent;
  }

  async didLoad() {
    const agent = this.agent;
    agent.registryClient = agent.cluster(RegistryClient).create();
    agent.apiClient = new ApiClient({
      cluster: agent.cluster,
    });
    agent.apiClient2 = new ApiClient2({
      cluster: agent.cluster,
    });
  }

  async willReady() {
    const agent = this.agent;
    await agent.registryClient.ready();
    await agent.apiClient.ready();
    await agent.apiClient2.ready();
  }
};
