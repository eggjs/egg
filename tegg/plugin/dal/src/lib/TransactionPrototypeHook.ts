import assert from 'node:assert';

import type { LifecycleHook } from '@eggjs/tegg-lifecycle';
import type { ModuleConfigHolder, Logger } from '@eggjs/tegg-types';
import type { EggPrototype, EggPrototypeLifecycleContext } from '@eggjs/tegg-metadata';
import { PropagationType } from '@eggjs/tegg-types';
import { TransactionMetaBuilder } from '@eggjs/tegg-transaction-decorator';
import { Pointcut } from '@eggjs/aop-decorator';

import { TransactionalAOP, type TransactionalParams } from './TransactionalAOP.ts';
import { MysqlDataSourceManager } from './MysqlDataSourceManager.ts';

export class TransactionPrototypeHook implements LifecycleHook<EggPrototypeLifecycleContext, EggPrototype> {
  private readonly moduleConfigs: Record<string, ModuleConfigHolder>;
  private readonly logger: Logger;

  constructor(moduleConfigs: Record<string, ModuleConfigHolder>, logger: Logger) {
    this.moduleConfigs = moduleConfigs;
    this.logger = logger;
  }

  public async preCreate(ctx: EggPrototypeLifecycleContext): Promise<void> {
    const builder = new TransactionMetaBuilder(ctx.clazz);
    const transactionMetadataList = builder.build();
    if (transactionMetadataList.length < 1) {
      return;
    }
    const moduleName = ctx.loadUnit.name;
    for (const transactionMetadata of transactionMetadataList) {
      const clazzName = `${moduleName}.${ctx.clazz.name}.${String(transactionMetadata.method)}`;
      const datasourceConfigs = (this.moduleConfigs[moduleName]?.config as any)?.dataSource || {};

      let datasourceName: string;
      if (transactionMetadata.datasourceName) {
        assert(
          datasourceConfigs[transactionMetadata.datasourceName],
          `method ${clazzName} specified datasource ${transactionMetadata.datasourceName} not exists`,
        );
        datasourceName = transactionMetadata.datasourceName;
        this.logger.info(`use datasource [${transactionMetadata.datasourceName}] for class ${clazzName}`);
      } else {
        const dataSources = Object.keys(datasourceConfigs);
        if (dataSources.length === 1) {
          datasourceName = dataSources[0];
        } else {
          throw new Error(
            `method ${clazzName} not specified datasource, module ${moduleName} has multi datasource, should specify datasource name`,
          );
        }
        this.logger.info(`use default datasource ${dataSources[0]} for class ${clazzName}`);
      }
      const adviceParams: TransactionalParams = {
        propagation: transactionMetadata.propagation,
        dataSourceGetter: () => {
          const mysqlDataSource = MysqlDataSourceManager.instance.get(moduleName, datasourceName);
          if (!mysqlDataSource) {
            throw new Error(`method ${clazzName} not found datasource ${datasourceName}`);
          }
          return mysqlDataSource;
        },
      };
      assert(
        adviceParams.propagation === PropagationType.REQUIRED,
        'Transactional propagation only support required for now',
      );
      Pointcut(TransactionalAOP, { adviceParams })((ctx.clazz as any).prototype, transactionMetadata.method);
    }
  }
}
