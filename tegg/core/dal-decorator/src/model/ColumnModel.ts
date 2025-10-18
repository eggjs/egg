import snakecase from 'lodash.snakecase';
import type { ColumnFormat, ColumnParams, ColumnTypeParams } from '@eggjs/tegg-types';

export class ColumnModel {
  columnName: string;
  propertyName: string;
  type: ColumnTypeParams;
  canNull: boolean;
  default?: string;
  comment?: string;
  visible?: boolean;
  autoIncrement?: boolean;
  uniqueKey?: boolean;
  primaryKey?: boolean;
  collate?: string;
  columnFormat?: ColumnFormat;
  engineAttribute?: string;
  secondaryEngineAttribute?: string;

  constructor(params: {
    columnName: string;
    propertyName: string;
    type: ColumnTypeParams;
    canNull: boolean;
    default?: string;
    comment?: string;
    visible?: boolean;
    autoIncrement?: boolean;
    uniqueKey?: boolean;
    primaryKey?: boolean;
    collate?: string;
    columnFormat?: ColumnFormat;
    engineAttribute?: string;
    secondaryEngineAttribute?: string;
  }) {
    this.columnName = params.columnName;
    this.propertyName = params.propertyName;
    this.type = params.type;
    this.canNull = params.canNull;
    this.default = params.default;
    this.comment = params.comment;
    this.visible = params.visible;
    this.autoIncrement = params.autoIncrement;
    this.uniqueKey = params.uniqueKey;
    this.primaryKey = params.primaryKey;
    this.collate = params.collate;
    this.columnFormat = params.columnFormat;
    this.engineAttribute = params.engineAttribute;
    this.secondaryEngineAttribute = params.secondaryEngineAttribute;
  }

  static build(property: string, type: ColumnTypeParams, params?: ColumnParams) {
    const columnName = params?.name ?? snakecase(property);
    let canNull = params?.canNull ?? false;
    if (params?.primaryKey) {
      canNull = false;
    }
    return new ColumnModel({
      columnName,
      propertyName: property,
      type,
      canNull,
      default: params?.default,
      comment: params?.comment,
      visible: params?.visible,
      autoIncrement: params?.autoIncrement,
      uniqueKey: params?.uniqueKey,
      primaryKey: params?.primaryKey,
      collate: params?.collate,
      columnFormat: params?.columnFormat,
      engineAttribute: params?.engineAttribute,
      secondaryEngineAttribute: params?.secondaryEngineAttribute,
    });
  }
}
