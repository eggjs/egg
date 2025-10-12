import assert from 'node:assert';

import type { ILifecycleBoot } from '@eggjs/core';

import type { Application, Agent } from '../../index.ts';

export class BaseHookClass implements ILifecycleBoot {
  declare fullPath?: string;
  #instance: Application | Agent;

  constructor(instance: Application | Agent) {
    this.#instance = instance;
  }

  get logger(): import('egg-logger').EggLogger {
    return this.#instance.logger;
  }

  get config(): import('../../index.ts').EggAppConfig {
    return this.#instance.config;
  }

  get app() {
    assert(this.#instance.type === 'application', 'agent boot should not use app instance');
    return this.#instance as Application;
  }

  get agent() {
    assert(this.#instance.type === 'agent', 'app boot should not use agent instance');
    return this.#instance as Agent;
  }
}
