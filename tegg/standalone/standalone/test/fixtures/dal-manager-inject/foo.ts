import type { MysqlDataSourceManager, SqlMapManager, TableModelManager } from '@eggjs/dal-plugin';
import { Inject, SingletonProto } from '@eggjs/tegg';
import { Runner, type MainRunner } from '@eggjs/tegg/standalone';

/**
 * Pins the PUBLIC dal manager injection surface: business modules inject the
 * dal managers by name.
 */
@Runner()
@SingletonProto()
export class Foo implements MainRunner<boolean> {
  @Inject()
  mysqlDataSourceManager: MysqlDataSourceManager;

  @Inject()
  sqlMapManager: SqlMapManager;

  @Inject()
  tableModelManager: TableModelManager;

  async main(): Promise<boolean> {
    return (
      typeof this.mysqlDataSourceManager.createDataSource === 'function' &&
      typeof this.sqlMapManager.get === 'function' &&
      typeof this.tableModelManager.get === 'function'
    );
  }
}
