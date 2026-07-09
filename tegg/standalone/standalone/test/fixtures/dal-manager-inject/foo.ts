import type { MysqlDataSourceManager } from '@eggjs/dal-plugin';
import { Inject, SingletonProto } from '@eggjs/tegg';
import { Runner, type MainRunner } from '@eggjs/tegg/standalone';

/**
 * Pins the PUBLIC `mysqlDataSourceManager` injection surface: business
 * modules inject the dal manager by name.
 */
@Runner()
@SingletonProto()
export class Foo implements MainRunner<boolean> {
  @Inject()
  mysqlDataSourceManager: MysqlDataSourceManager;

  async main(): Promise<boolean> {
    return typeof this.mysqlDataSourceManager.createDataSource === 'function';
  }
}
