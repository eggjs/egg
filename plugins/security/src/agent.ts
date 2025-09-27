import type { ILifecycleBoot, EggCore } from '@eggjs/core';
import { preprocessConfig } from './lib/utils.js';

export default class AgentBoot implements ILifecycleBoot {
  private readonly agent;

  constructor(agent: EggCore) {
    this.agent = agent;
  }

  async configWillLoad() {
    preprocessConfig(this.agent.config.security);
  }
}
