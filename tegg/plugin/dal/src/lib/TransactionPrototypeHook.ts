import assert from 'node:assert';

import { Pointcut } from '@eggjs/aop-decorator';
import { EggPrototypeLifecycleProto, Inject } from '@eggjs/core-decorator';
import type { LifecycleHook } from '@eggjs/lifecycle';
import type { EggPrototype, EggPrototypeLifecycleContext } from '@eggjs/metadata';
import type { ModuleConfigs } from '@eggjs/tegg-common-util';
import type { Logger } from '@eggjs/tegg-types';
import { PropagationType } from '@eggjs/tegg-types';
import { TransactionMetaBuilder } from '@eggjs/transaction-decorator';

import { MysqlDataSourceManager } from './MysqlDataSourceManager.ts';
import { TransactionalAOP, type TransactionalParams } from './TransactionalAOP.ts';

@EggPrototypeLifecycleProto()
export class TransactionPrototypeHook implements LifecycleHook<EggPrototypeLifecycleContext, EggPrototype> {
  @Inject()
  private readonly moduleConfigs: ModuleConfigs;

  @Inject()
  private readonly logger: Logger;

  public async preCreate(ctx: EggPrototypeLifecycleContext): Promise<void> {
    const builder = new TransactionMetaBuilder(ctx.clazz);
    const transactionMetadataList = builder.build();
    if (transactionMetadataList.length < 1) {
      return;
    }
    const moduleName = ctx.loadUnit.name;
    const datasourceConfigs = (this.moduleConfigs.inner[moduleName]?.config as any)?.dataSource || {};
    const dataSources = Object.keys(datasourceConfigs);
    if (dataSources.length === 0) {
      return;
    }

    for (const transactionMetadata of transactionMetadataList) {
      const clazzName = `${moduleName}.${ctx.clazz.name}.${String(transactionMetadata.method)}`;
      let datasourceName: string;
      if (transactionMetadata.datasourceName) {
        assert(
          datasourceConfigs[transactionMetadata.datasourceName],
          `method ${clazzName} specified datasource ${transactionMetadata.datasourceName} not exists`,
        );
        datasourceName = transactionMetadata.datasourceName;
        this.logger.info(`use datasource [${transactionMetadata.datasourceName}] for class ${clazzName}`);
      } else {
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
