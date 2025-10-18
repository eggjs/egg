import { EggLoadUnitType } from '@eggjs/tegg-types';
import { DaoInfoUtil } from '@eggjs/dal-decorator';
import { type BaseDaoType } from '@eggjs/tegg-types/dal';
import { LoaderFactory } from '@eggjs/tegg-loader';

export class DaoLoader {
  static async loadDaos(moduleDir: string): Promise<Array<BaseDaoType>> {
    const loader = LoaderFactory.createLoader(moduleDir, EggLoadUnitType.MODULE);
    const clazzList = await loader.load();
    return clazzList.filter((t): t is BaseDaoType => {
      return DaoInfoUtil.getIsDao(t);
    });
  }
}
