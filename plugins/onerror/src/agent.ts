import type { ILifecycleBoot, Agent } from 'egg';

export default class Boot implements ILifecycleBoot {
  private agent: Agent;

  constructor(agent: Agent) {
    this.agent = agent;
  }

  async didLoad() {
    // should watch error event
    this.agent.on('error', err => {
      this.agent.coreLogger.error(err);
    });
  }
}
