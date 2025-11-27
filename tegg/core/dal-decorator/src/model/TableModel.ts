import assert from 'node:assert';

import type { CompressionType, EggProtoImplClass, InsertMethod, RowFormat } from '@eggjs/tegg-types';
import { IndexType } from '@eggjs/tegg-types';
import snakecase from 'lodash.snakecase';
import pluralize from 'pluralize';

import { TableInfoUtil, ColumnInfoUtil, IndexInfoUtil } from '../util/index.ts';
import { ColumnModel } from './ColumnModel.ts';
import { IndexModel } from './IndexModel.ts';

export class TableModel<T = object> {
  clazz: EggProtoImplClass<T>;
  name: string;
  columns: Array<ColumnModel>;
  indices: Array<IndexModel>;
  dataSourceName: string;
  comment?: string;
  autoExtendSize?: number;
  autoIncrement?: number;
  avgRowLength?: number;
  characterSet?: string;
  collate?: string;
  compression?: CompressionType;
  encryption?: boolean;
  engine?: string;
  engineAttribute?: string;
  insertMethod?: InsertMethod;
  keyBlockSize?: number;
  maxRows?: number;
  minRows?: number;
  rowFormat?: RowFormat;
  secondaryEngineAttribute?: string;

  constructor(params: {
    clazz: EggProtoImplClass<T>;
    name: string;
    dataSourceName: string;
    columns: Array<ColumnModel>;
    indices: Array<IndexModel>;
    comment?: string;
    autoExtendSize?: number;
    autoIncrement?: number;
    avgRowLength?: number;
    characterSet?: string;
    collate?: string;
    compression?: CompressionType;
    encryption?: boolean;
    engine?: string;
    engineAttribute?: string;
    insertMethod?: InsertMethod;
    keyBlockSize?: number;
    maxRows?: number;
    minRows?: number;
    rowFormat?: RowFormat;
    secondaryEngineAttribute?: string;
  }) {
    this.clazz = params.clazz;
    this.name = params.name;
    this.dataSourceName = params.dataSourceName;
    this.columns = params.columns;
    this.indices = params.indices;
    this.comment = params.comment;
    this.autoExtendSize = params.autoExtendSize;
    this.autoIncrement = params.autoIncrement;
    this.avgRowLength = params.avgRowLength;
    this.characterSet = params.characterSet;
    this.collate = params.collate;
    this.compression = params.compression;
    this.encryption = params.encryption;
    this.engine = params.engine;
    this.engineAttribute = params.engineAttribute;
    this.insertMethod = params.insertMethod;
    this.keyBlockSize = params.keyBlockSize;
    this.maxRows = params.maxRows;
    this.minRows = params.minRows;
    this.rowFormat = params.rowFormat;
    this.secondaryEngineAttribute = params.secondaryEngineAttribute;
  }

  getPrimary(): IndexModel | undefined {
    const index = this.indices.find((t) => t.type === IndexType.PRIMARY);
    if (index) {
      return index;
    }
    const primaryColumn = this.columns.filter((t) => t.primaryKey === true);
    return new IndexModel({
      name: 'PRIMARY',
      type: IndexType.PRIMARY,
      keys: primaryColumn.map((t) => {
        return {
          columnName: t.columnName,
          propertyName: t.propertyName,
        };
      }),
    });
  }

  static build<T>(clazz: EggProtoImplClass<T>): TableModel<T> {
    const params = TableInfoUtil.getTableParams(clazz as EggProtoImplClass);
    const name = params?.name ?? snakecase(pluralize(clazz.name));
    const columnInfoMap = ColumnInfoUtil.getColumnInfoMap(clazz as EggProtoImplClass);
    const columnTypeMap = ColumnInfoUtil.getColumnTypeMap(clazz as EggProtoImplClass);
    const dataSourceName = params?.dataSourceName ?? 'default';
    assert(TableInfoUtil.getIsTable(clazz as EggProtoImplClass), `${name} is not Table`);
    assert(columnTypeMap, `${name} has no columns`);
    const columns: Array<ColumnModel> = [];
    const indices: Array<IndexModel> = [];
    for (const [property, columnType] of columnTypeMap?.entries() ?? []) {
      const columnParam = columnInfoMap?.get(property);
      columns.push(ColumnModel.build(property, columnType, columnParam));
    }

    const indexList = IndexInfoUtil.getIndexList(clazz as EggProtoImplClass);
    for (const index of indexList) {
      indices.push(IndexModel.build(index, columns, clazz));
    }

    return new TableModel({
      clazz,
      name,
      columns,
      indices,
      dataSourceName,

      comment: params?.comment,
      autoExtendSize: params?.autoExtendSize,
      autoIncrement: params?.autoIncrement,
      avgRowLength: params?.avgRowLength,
      characterSet: params?.characterSet,
      collate: params?.collate,
      compression: params?.compression,
      encryption: params?.encryption,
      engine: params?.engine,
      engineAttribute: params?.engineAttribute,
      insertMethod: params?.insertMethod,
      keyBlockSize: params?.keyBlockSize,
      maxRows: params?.maxRows,
      minRows: params?.minRows,
      rowFormat: params?.rowFormat,
      secondaryEngineAttribute: params?.secondaryEngineAttribute,
    });
  }
}
