import { MetadataUtil } from '@eggjs/core-decorator';
import type { EggProtoImplClass } from '@eggjs/tegg-types';
import { type BaseDaoType, DAL_IS_DAO } from '@eggjs/tegg-types';

export class DaoInfoUtil {
  static setIsDao(clazz: EggProtoImplClass): void {
    MetadataUtil.defineMetaData(DAL_IS_DAO, true, clazz);
  }

  static getIsDao(clazz: EggProtoImplClass): clazz is BaseDaoType {
    return MetadataUtil.getOwnMetaData(DAL_IS_DAO, clazz) === true;
  }
}
