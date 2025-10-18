import { DAL_INDEX_LIST } from '@eggjs/tegg-types';
import type { EggProtoImplClass, IndexParams } from '@eggjs/tegg-types';
import { MetadataUtil } from '@eggjs/core-decorator';

export class IndexInfoUtil {
  static addIndex(clazz: EggProtoImplClass, index: IndexParams) {
    const indexList: Array<IndexParams> = MetadataUtil.initOwnArrayMetaData(DAL_INDEX_LIST, clazz, []);
    indexList.push(index);
  }

  static getIndexList(clazz: EggProtoImplClass): Array<IndexParams> {
    return MetadataUtil.getMetaData(DAL_INDEX_LIST, clazz) || [];
  }
}
