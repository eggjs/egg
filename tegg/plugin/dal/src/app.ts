import { TeggScope } from '@eggjs/tegg-types';
import type { Application, ILifecycleBoot } from 'egg';

import { DalModuleLoadUnitHook } from './lib/DalModuleLoadUnitHook.ts';
import { DalTableEggPrototypeHook } from './lib/DalTableEggPrototypeHook.ts';
import { MysqlDataSourceManager } from './lib/MysqlDataSourceManager.ts';
import { SqlMapManager } from './lib/SqlMapManager.ts';
import { TableModelManager } from './lib/TableModelManager.ts';
import { TransactionPrototypeHook } from './lib/TransactionPrototypeHook.ts';

export default class DalAppBootHook implements ILifecycleBoot {
  private readonly app: Application;
  private dalTableEggPrototypeHook: DalTableEggPrototypeHook;
  private dalModuleLoadUnitHook: DalModuleLoadUnitHook;
  private transactionPrototypeHook: TransactionPrototypeHook;

  constructor(app: Application) {
    this.app = app;
  }

  configWillLoad(): void {
    this.dalModuleLoadUnitHook = new DalModuleLoadUnitHook(this.app.config.env, this.app.moduleConfigs);
    this.dalTableEggPrototypeHook = new DalTableEggPrototypeHook(this.app.logger);
    this.transactionPrototypeHook = new TransactionPrototypeHook(this.app.moduleConfigs, this.app.logger);
    TeggScope.run(this.app._teggScopeBag, () => {
      this.app.eggPrototypeLifecycleUtil.registerLifecycle(this.dalTableEggPrototypeHook);
      this.app.eggPrototypeLifecycleUtil.registerLifecycle(this.transactionPrototypeHook);
      this.app.loadUnitLifecycleUtil.registerLifecycle(this.dalModuleLoadUnitHook);
    });
  }

  async beforeClose(): Promise<void> {
    await TeggScope.run(this.app._teggScopeBag, async () => {
      if (this.dalTableEggPrototypeHook) {
        this.app.eggPrototypeLifecycleUtil.deleteLifecycle(this.dalTableEggPrototypeHook);
      }
      if (this.dalModuleLoadUnitHook) {
        this.app.loadUnitLifecycleUtil.deleteLifecycle(this.dalModuleLoadUnitHook);
      }
      if (this.transactionPrototypeHook) {
        this.app.eggPrototypeLifecycleUtil.deleteLifecycle(this.transactionPrototypeHook);
      }
      MysqlDataSourceManager.instance.clear();
      SqlMapManager.instance.clear();
      TableModelManager.instance.clear();
    });
  }
}
