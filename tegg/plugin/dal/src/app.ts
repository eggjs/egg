import { TeggScope } from '@eggjs/tegg-types';
import type { Application, ILifecycleBoot } from 'egg';

import { SqlMapManager } from './lib/SqlMapManager.ts';
import { TableModelManager } from './lib/TableModelManager.ts';

export default class DalAppBootHook implements ILifecycleBoot {
  private readonly app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  async beforeClose(): Promise<void> {
    // The per-app DAL managers are resolved/cleared within this app's scope.
    await TeggScope.run(this.app._teggScopeBag, async () => {
      SqlMapManager.instance.clear();
      TableModelManager.instance.clear();
    });
  }
}
