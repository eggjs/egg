import { type LifecycleHook, type Logger, type ModuleConfigHolder } from '@eggjs/tegg';
import { DatabaseForker, type DataSourceOptions } from '@eggjs/dal-runtime';
import { type LoadUnit, type LoadUnitLifecycleContext } from '@eggjs/tegg/helper';

import { MysqlDataSourceManager } from './MysqlDataSourceManager.ts';

export class DalModuleLoadUnitHook implements LifecycleHook<LoadUnitLifecycleContext, LoadUnit> {
  private readonly moduleConfigs: Record<string, ModuleConfigHolder>;
  private readonly env: string;
  private readonly logger?: Logger;

  constructor(env: string, moduleConfigs: Record<string, ModuleConfigHolder>, logger?: Logger) {
    this.env = env;
    this.moduleConfigs = moduleConfigs;
    this.logger = logger;
  }

  async preCreate(_: LoadUnitLifecycleContext, loadUnit: LoadUnit): Promise<void> {
    const moduleConfigHolder = this.moduleConfigs[loadUnit.name];
    if (!moduleConfigHolder) return;
    const dataSourceConfig: Record<string, DataSourceOptions> | undefined = (moduleConfigHolder.config as any)
      .dataSource;
    if (!dataSourceConfig) return;
    await Promise.all(
      Object.entries(dataSourceConfig).map(async ([name, config]) => {
        const dataSourceOptions = {
          ...config,
          name,
          logger: this.logger,
        };
        const forker = new DatabaseForker(this.env, dataSourceOptions);
        if (forker.shouldFork()) {
          await forker.forkDb(loadUnit.unitPath);
        }

        try {
          await MysqlDataSourceManager.instance.createDataSource(loadUnit.name, name, dataSourceOptions);
        } catch (e) {
          if (e instanceof Error) {
            e.message = `create module ${loadUnit.name} datasource ${name} failed: ${e.message}`;
          }
          throw e;
        }
      })
    );
  }
}
