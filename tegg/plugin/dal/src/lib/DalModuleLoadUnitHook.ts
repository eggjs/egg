import { Inject, InjectOptional, LoadUnitLifecycleProto } from '@eggjs/core-decorator';
import { DatabaseForker, type DataSourceOptions } from '@eggjs/dal-runtime';
import type { LifecycleHook } from '@eggjs/lifecycle';
import type { LoadUnit, LoadUnitLifecycleContext } from '@eggjs/metadata';
import type { ModuleConfigs, RuntimeConfig } from '@eggjs/tegg-common-util';
import type { Logger } from '@eggjs/tegg-types';

import { MysqlDataSourceManager } from './MysqlDataSourceManager.ts';

@LoadUnitLifecycleProto()
export class DalModuleLoadUnitHook implements LifecycleHook<LoadUnitLifecycleContext, LoadUnit> {
  @Inject()
  private readonly moduleConfigs: ModuleConfigs;

  @Inject()
  private readonly runtimeConfig: Partial<RuntimeConfig>;

  @InjectOptional()
  private readonly logger?: Logger;

  private get env(): string {
    return this.runtimeConfig.env ?? '';
  }

  async preCreate(_: LoadUnitLifecycleContext, loadUnit: LoadUnit): Promise<void> {
    const moduleConfigHolder = this.moduleConfigs.inner[loadUnit.name];
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
      }),
    );
  }
}
