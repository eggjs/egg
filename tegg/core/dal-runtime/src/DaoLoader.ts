import { DaoInfoUtil } from '@eggjs/dal-decorator';
import { LoaderFactory } from '@eggjs/tegg-loader';
import { EggLoadUnitType } from '@eggjs/tegg-types';
import { type BaseDaoType } from '@eggjs/tegg-types/dal';

export class DaoLoader {
  static async loadDaos(moduleDir: string): Promise<Array<BaseDaoType>> {
    const loader = LoaderFactory.createLoader(moduleDir, EggLoadUnitType.MODULE);
    const clazzList = await loader.load();
    return clazzList.filter((t): t is BaseDaoType => {
      return DaoInfoUtil.getIsDao(t);
    });
  }
}
