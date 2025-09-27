import type { ILifecycleBoot, Agent } from 'egg';

import { preprocessConfig } from './lib/utils.ts';

export default class AgentBoot implements ILifecycleBoot {
  private readonly agent;

  constructor(agent: Agent) {
    this.agent = agent;
  }

  async configWillLoad() {
    preprocessConfig(this.agent.config.security);
  }
}
