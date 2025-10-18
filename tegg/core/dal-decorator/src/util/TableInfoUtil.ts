import { DAL_IS_TABLE, DAL_TABLE_PARAMS } from '@eggjs/tegg-types';
import type { EggProtoImplClass, TableParams } from '@eggjs/tegg-types';
import { MetadataUtil } from '@eggjs/core-decorator';

export const TABLE_CLAZZ_LIST: Array<EggProtoImplClass> = [];

export class TableInfoUtil {
  static setIsTable(clazz: EggProtoImplClass) {
    TABLE_CLAZZ_LIST.push(clazz);
    MetadataUtil.defineMetaData(DAL_IS_TABLE, true, clazz);
  }

  // TODO del
  static getClazzList() {
    return TABLE_CLAZZ_LIST;
  }

  static getIsTable(clazz: EggProtoImplClass) {
    return MetadataUtil.getMetaData(DAL_IS_TABLE, clazz) === true;
  }

  static setTableParams(clazz: EggProtoImplClass, params: TableParams) {
    MetadataUtil.defineMetaData(DAL_TABLE_PARAMS, params, clazz);
  }

  static getTableParams(clazz: EggProtoImplClass): TableParams | undefined {
    return MetadataUtil.getMetaData(DAL_TABLE_PARAMS, clazz);
  }
}
