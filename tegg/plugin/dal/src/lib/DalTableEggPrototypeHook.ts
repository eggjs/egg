import { type Logger, type LifecycleHook } from '@eggjs/tegg';
import { type EggPrototype, type EggPrototypeLifecycleContext } from '@eggjs/tegg/helper';
import { DaoInfoUtil, TableModel } from '@eggjs/dal-decorator';
import { SqlMapLoader } from '@eggjs/dal-runtime';

import { TableModelManager } from './TableModelManager.ts';
import { SqlMapManager } from './SqlMapManager.ts';

export class DalTableEggPrototypeHook implements LifecycleHook<EggPrototypeLifecycleContext, EggPrototype> {
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async preCreate(ctx: EggPrototypeLifecycleContext): Promise<void> {
    if (!DaoInfoUtil.getIsDao(ctx.clazz)) {
      return;
    }
    const tableClazz = ctx.clazz.clazzModel;
    const tableModel: TableModel<object> = TableModel.build(tableClazz);
    TableModelManager.instance.set(ctx.loadUnit.name, tableModel);
    const loader = new SqlMapLoader(tableModel, ctx.clazz, this.logger);
    const sqlMap = loader.load();
    SqlMapManager.instance.set(ctx.loadUnit.name, sqlMap);
  }
}
