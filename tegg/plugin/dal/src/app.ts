import { TeggScope } from '@eggjs/tegg-types';
import type { Application, ILifecycleBoot } from 'egg';

import { MysqlDataSourceManager } from './lib/MysqlDataSourceManager.ts';
import { SqlMapManager } from './lib/SqlMapManager.ts';
import { TableModelManager } from './lib/TableModelManager.ts';

export default class DalAppBootHook implements ILifecycleBoot {
  private readonly app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  configDidLoad(): void {
    // The DAL hooks are module plugin classes (@XxxLifecycleProto): buffer them
    // on the moduleHandler (created in the tegg plugin's configDidLoad, which
    // runs before ours) so they are instantiated inside the InnerObjectLoadUnit
    // — with moduleConfigs/runtimeConfig/logger injected — before any business
    // load unit is created. Registration/deregistration is automatic.
  }

  async beforeClose(): Promise<void> {
    // The per-app DAL managers are resolved/cleared within this app's scope.
    await TeggScope.run(this.app._teggScopeBag, async () => {
      MysqlDataSourceManager.instance.clear();
      SqlMapManager.instance.clear();
      TableModelManager.instance.clear();
    });
  }
}
