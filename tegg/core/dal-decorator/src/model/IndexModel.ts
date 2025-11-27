import type { IndexParams, IndexStoreType } from '@eggjs/tegg-types';
import { type EggProtoImplClass, IndexType } from '@eggjs/tegg-types';

import { ColumnModel } from './ColumnModel.ts';

export interface IndexKey {
  columnName: string;
  propertyName: string;
}

export class IndexModel {
  name: string;
  keys: IndexKey[];
  type: IndexType;

  storeType?: IndexStoreType;
  comment?: string;
  engineAttribute?: string;
  secondaryEngineAttribute?: string;
  parser?: string;

  constructor(params: {
    name: string;
    keys: IndexKey[];
    type: IndexType;
    storeType?: IndexStoreType;
    comment?: string;
    engineAttribute?: string;
    secondaryEngineAttribute?: string;
    parser?: string;
  }) {
    this.name = params.name;
    this.keys = params.keys;
    this.type = params.type;
    this.storeType = params.storeType;
    this.comment = params.comment;
    this.engineAttribute = params.engineAttribute;
    this.secondaryEngineAttribute = params.secondaryEngineAttribute;
    this.parser = params.parser;
  }

  static buildIndexName(keys: string[], type: IndexType): string {
    const prefix = type === IndexType.UNIQUE ? 'uk_' : 'idx_';
    return prefix + keys.join('_');
  }

  static build(params: IndexParams, columns: ColumnModel[], clazz: EggProtoImplClass<unknown>): IndexModel {
    const type = params.type ?? IndexType.INDEX;
    const keys: Array<IndexKey> = params.keys.map((t) => {
      const column = columns.find((c) => c.propertyName === t);
      if (!column) {
        throw new Error(`Table ${clazz.name} index configuration error: has no property named "${t}"`);
      }
      return {
        propertyName: column!.propertyName,
        columnName: column!.columnName,
      };
    });
    const name =
      params.name ??
      IndexModel.buildIndexName(
        keys.map((t) => t.columnName),
        type,
      );
    return new IndexModel({
      name,
      keys,
      type,
      storeType: params.storeType,
      comment: params.comment,
      engineAttribute: params.engineAttribute,
      secondaryEngineAttribute: params.secondaryEngineAttribute,
      parser: params.parser,
    });
  }
}
