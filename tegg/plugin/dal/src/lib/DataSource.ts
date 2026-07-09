import assert from 'node:assert';

import {
  AccessLevel,
  Inject,
  LoadUnitNameQualifierAttribute,
  MultiInstanceInfo,
  MultiInstanceProto,
  type MultiInstancePrototypeGetObjectsContext,
  type ObjectInfo,
  ObjectInitType,
} from '@eggjs/core-decorator';
import { DataSourceInjectName, DataSourceQualifierAttribute, TableInfoUtil, TableModel } from '@eggjs/dal-decorator';
import { DataSource } from '@eggjs/dal-runtime';
import { ModuleConfigUtil } from '@eggjs/tegg-common-util';
import { LoaderFactory } from '@eggjs/tegg-loader';
import { EggLoadUnitType } from '@eggjs/tegg-types';

import { MysqlDataSourceManager } from './MysqlDataSourceManager.ts';
import { SqlMapManager } from './SqlMapManager.ts';
import { TableModelManager } from './TableModelManager.ts';
import { TransactionalAOP } from './TransactionalAOP.ts';

@MultiInstanceProto({
  accessLevel: AccessLevel.PUBLIC,
  initType: ObjectInitType.SINGLETON,
  async getObjects(ctx: MultiInstancePrototypeGetObjectsContext) {
    const config = ModuleConfigUtil.loadModuleConfigSync(ctx.unitPath) as any | undefined;
    const dataSources = Object.keys(config?.dataSource || {});
    const result: ObjectInfo[] = [];
    const loader = LoaderFactory.createLoader(ctx.unitPath, EggLoadUnitType.MODULE);
    const clazzList = await loader.load();
    const tableClazzList = clazzList.filter((t) => {
      return TableInfoUtil.getIsTable(t);
    });
    const dataSourceLength = dataSources.length;
    for (const dataSource of dataSources) {
      const moduleClazzList = tableClazzList.filter((clazz) => {
        const tableParams = TableInfoUtil.getTableParams(clazz);
        const dataSourceName = tableParams?.dataSourceName ?? 'default';
        return dataSourceLength === 1 || dataSourceName === dataSource;
      });
      for (const clazz of moduleClazzList) {
        result.push({
          name: DataSourceInjectName,
          qualifiers: [
            {
              attribute: DataSourceQualifierAttribute,
              value: `${ctx.moduleName}.${dataSource}.${clazz.name}`,
            },
          ],
        });
      }
    }
    return result;
  },
})
export class DataSourceDelegate<T> extends DataSource<T> {
  // @ts-expect-error ignore nerver use
  private transactionalAOP: TransactionalAOP;
  objInfo: ObjectInfo;

  constructor(
    @Inject() mysqlDataSourceManager: MysqlDataSourceManager,
    @Inject({ name: 'transactionalAOP' }) transactionalAOP: TransactionalAOP,
    @MultiInstanceInfo([DataSourceQualifierAttribute, LoadUnitNameQualifierAttribute])
    objInfo: ObjectInfo,
  ) {
    const dataSourceQualifierValue = objInfo.qualifiers.find(
      (t) => t.attribute === DataSourceQualifierAttribute,
    )?.value;
    assert(dataSourceQualifierValue);
    const [moduleName, dataSource, clazzName] = (dataSourceQualifierValue as string).split('.');
    const tableModel = TableModelManager.instance.get(moduleName, clazzName);
    assert(tableModel, `not found table ${dataSourceQualifierValue}`);
    const mysqlDataSource = mysqlDataSourceManager.get(moduleName, dataSource);
    assert(mysqlDataSource, `not found dataSource ${dataSource} in module ${moduleName}`);
    const sqlMap = SqlMapManager.instance.get(moduleName, clazzName);
    assert(sqlMap, `not found SqlMap ${clazzName} in module ${moduleName}`);

    super(tableModel as TableModel<T>, mysqlDataSource, sqlMap);
    this.transactionalAOP = transactionalAOP;
    this.objInfo = objInfo;
  }
}
