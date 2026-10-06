import assert from 'node:assert';

import { GlobalGraph } from '@eggjs/metadata';
import type { Application, ILifecycleBoot } from 'egg';

export default class AopAppHook implements ILifecycleBoot {
  private readonly app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  async didLoad(): Promise<void> {
    await this.app.moduleHandler.ready();
    // The graph already ran the declaratively registered build hooks during
    // build. Resolve the per-app graph for the sanity assert.
    assert(GlobalGraph.instanceFor(this.app._teggScopeBag), 'GlobalGraph.instance is not set');
  }
}
