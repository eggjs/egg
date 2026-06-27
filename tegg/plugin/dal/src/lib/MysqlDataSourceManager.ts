import crypto from 'node:crypto';

import { type DataSourceOptions, MysqlDataSource } from '@eggjs/dal-runtime';
import { TeggScope } from '@eggjs/tegg-types';

const MYSQL_DATA_SOURCE_MANAGER_SLOT = Symbol('tegg:dal:mysqlDataSourceManager');

export class MysqlDataSourceManager {
  // Per-app: holds live MysqlDataSource connections keyed by config hash. Made
  // per-app so two apps with identical DB config no longer share one connection
  // object (and each app's teardown only disposes its own).
  static get instance(): MysqlDataSourceManager {
    return TeggScope.resolve(
      MYSQL_DATA_SOURCE_MANAGER_SLOT,
      () => new MysqlDataSourceManager(),
      'MysqlDataSourceManager.instance',
    );
  }

  private readonly dataSourceIndices: Map<
    string /* moduleName */,
    Map<string /* dataSourceName */, string /* dataSourceIndex */>
  >;
  private readonly dataSources: Map<string /* dataSourceIndex */, MysqlDataSource>;

  constructor() {
    this.dataSourceIndices = new Map();
    this.dataSources = new Map();
  }

  get(moduleName: string, dataSourceName: string): MysqlDataSource | undefined {
    const dataSourceIndex = this.dataSourceIndices.get(moduleName)?.get(dataSourceName);
    if (dataSourceIndex) {
      return this.dataSources.get(dataSourceIndex);
    }
  }

  async createDataSource(moduleName: string, dataSourceName: string, config: DataSourceOptions): Promise<void> {
    const { logger, ...dsConfig } = config || {};
    const dataSourceConfig = {
      ...dsConfig,
      name: dataSourceName,
    };
    const index = MysqlDataSourceManager.createDataSourceKey(dataSourceConfig);
    let dataSource = this.dataSources.get(index);
    if (!dataSource) {
      dataSource = new MysqlDataSource({ ...dataSourceConfig, logger });
      this.dataSources.set(index, dataSource);
    }
    let moduleDataSourceIndices = this.dataSourceIndices.get(moduleName);
    if (!moduleDataSourceIndices) {
      moduleDataSourceIndices = new Map();
      this.dataSourceIndices.set(moduleName, moduleDataSourceIndices);
    }
    moduleDataSourceIndices.set(dataSourceName, index);

    await dataSource.ready();
  }

  clear(): void {
    // Release this app's datasource references on teardown. (Both maps are
    // per-app; dropping them lets the MysqlDataSource objects be collected
    // instead of lingering after the owning app closes.)
    this.dataSources.clear();
    this.dataSourceIndices.clear();
  }

  static createDataSourceKey(dataSourceOptions: DataSourceOptions): string {
    const hash = crypto.createHash('md5');
    const keys = Object.keys(dataSourceOptions).sort();
    for (const key of keys) {
      const value = dataSourceOptions[key as keyof DataSourceOptions];
      if (value) {
        hash.update(key);
        hash.update(String(value));
      }
    }
    return hash.digest('hex');
  }
}
