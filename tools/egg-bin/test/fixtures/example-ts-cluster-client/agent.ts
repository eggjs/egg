export default class Boot {
  agent: any;

  constructor(agent: any) {
    this.agent = agent;
  }

  async didLoad() {
    const RegistryClient = (await import('./lib/registry_client.ts')).default;
    this.agent.registryClient = this.agent.cluster(RegistryClient).create();
  }

  async willReady() {
    await this.agent.registryClient.ready();
  }
}
