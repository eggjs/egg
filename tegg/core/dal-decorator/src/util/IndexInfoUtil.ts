import { MetadataUtil } from '@eggjs/core-decorator';
import type { EggProtoImplClass, IndexParams } from '@eggjs/tegg-types';
import { DAL_INDEX_LIST } from '@eggjs/tegg-types';

export class IndexInfoUtil {
  static addIndex(clazz: EggProtoImplClass, index: IndexParams): void {
    const indexList: Array<IndexParams> = MetadataUtil.initOwnArrayMetaData(DAL_INDEX_LIST, clazz, []);
    indexList.push(index);
  }

  static getIndexList(clazz: EggProtoImplClass): Array<IndexParams> {
    return MetadataUtil.getMetaData(DAL_INDEX_LIST, clazz) || [];
  }
}
