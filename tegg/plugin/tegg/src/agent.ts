import type { Agent, ILifecycleBoot } from 'egg';

import { installTeggLoaderFS } from './lib/install-tegg-loader-fs.ts';

export default class TeggAgentBoot implements ILifecycleBoot {
  readonly #agent: Agent;

  constructor(agent: Agent) {
    this.#agent = agent;
  }

  configDidLoad(): void {
    installTeggLoaderFS(this.#agent);
  }
}
