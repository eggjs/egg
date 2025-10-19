import { MetadataUtil } from '@eggjs/core-decorator';
import type {
  AttributeOptions,
  EggProtoImplClass,
  IndexOptions,
  ModelAttributeInfo,
  ModelIndexInfo,
} from '@eggjs/tegg-types';
import {
  IS_MODEL,
  MODEL_DATA_ATTRIBUTES,
  MODEL_DATA_INDICES,
  MODEL_DATA_SOURCE,
  MODEL_DATA_TABLE_NAME,
} from '@eggjs/tegg-types';

type ModelAttributeMap = Map<string, ModelAttributeInfo>;

export class ModelInfoUtil {
  static setIsModel(isModel: boolean, clazz: EggProtoImplClass): void {
    MetadataUtil.defineMetaData(IS_MODEL, isModel, clazz);
  }

  static getIsModel(clazz: EggProtoImplClass): boolean {
    return MetadataUtil.getBooleanMetaData(IS_MODEL, clazz);
  }

  static setDataSource(dataSource: string, clazz: EggProtoImplClass): void {
    MetadataUtil.defineMetaData(MODEL_DATA_SOURCE, dataSource, clazz);
  }

  static getDataSource(clazz: EggProtoImplClass): string | undefined {
    return MetadataUtil.getMetaData(MODEL_DATA_SOURCE, clazz);
  }

  static setTableName(tableName: string, clazz: EggProtoImplClass): void {
    MetadataUtil.defineMetaData(MODEL_DATA_TABLE_NAME, tableName, clazz);
  }

  static getTableName(clazz: EggProtoImplClass): string | undefined {
    return MetadataUtil.getMetaData(MODEL_DATA_TABLE_NAME, clazz);
  }

  static addModelIndex(fields: string[], options: IndexOptions | undefined, clazz: EggProtoImplClass): void {
    const indexInfo: Array<ModelIndexInfo> = MetadataUtil.initOwnArrayMetaData(MODEL_DATA_INDICES, clazz, []);
    indexInfo.push({
      fields,
      options,
    });
  }

  static getModelIndices(clazz: EggProtoImplClass): Array<ModelIndexInfo> {
    return MetadataUtil.getArrayMetaData(MODEL_DATA_INDICES, clazz);
  }

  static addModelAttribute(
    dataType: string,
    options: AttributeOptions | undefined,
    clazz: EggProtoImplClass,
    property: string
  ): void {
    const attributeMap: ModelAttributeMap = MetadataUtil.initOwnMapMetaData(MODEL_DATA_ATTRIBUTES, clazz, new Map());
    attributeMap.set(property, {
      dataType,
      options,
    });
  }

  static getModelAttributes(clazz: EggProtoImplClass): ModelAttributeMap | undefined {
    return MetadataUtil.getMetaData(MODEL_DATA_ATTRIBUTES, clazz);
  }
}
