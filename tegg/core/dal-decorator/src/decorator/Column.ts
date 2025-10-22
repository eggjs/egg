import assert from 'node:assert';

import type { ColumnParams, ColumnTypeParams, EggProtoImplClass } from '@eggjs/tegg-types';

import { ColumnInfoUtil } from '../util/index.ts';

export function Column(type: ColumnTypeParams, params?: ColumnParams) {
  return function (target: any, propertyKey: PropertyKey): void {
    assert(
      typeof propertyKey === 'string',
      `[Column/${target.name}] expect column name be typeof string, but now is ${String(propertyKey)}`,
    );
    const tableClazz = target.constructor as EggProtoImplClass;
    const columnName = propertyKey as string;
    ColumnInfoUtil.addColumnType(tableClazz, columnName, type);
    if (params) {
      ColumnInfoUtil.addColumnInfo(tableClazz, columnName, params);
    }
  };
}
