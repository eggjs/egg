import assert from 'node:assert';

import type { ILifecycleBoot } from '@eggjs/core';
import type { EggLogger } from 'egg-logger';

import type { Application, Agent, EggAppConfig } from '../../index.ts';

export class BaseHookClass implements ILifecycleBoot {
  declare fullPath?: string;
  #instance: Application | Agent;

  constructor(instance: Application | Agent) {
    this.#instance = instance;
  }

  get logger(): EggLogger {
    return this.#instance.logger;
  }

  get config(): EggAppConfig {
    return this.#instance.config;
  }

  get app(): Application {
    assert(this.#instance.type === 'application', 'agent boot should not use app instance');
    return this.#instance as Application;
  }

  get agent(): Agent {
    assert(this.#instance.type === 'agent', 'app boot should not use agent instance');
    return this.#instance as Agent;
  }
}
