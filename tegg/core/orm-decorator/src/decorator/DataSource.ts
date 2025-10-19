import type { EggProtoImplClass } from '@eggjs/tegg-types';

import { ModelInfoUtil } from '../util/index.ts';

export function DataSource(dataSource: string) {
  return function (clazz: EggProtoImplClass): void {
    ModelInfoUtil.setDataSource(dataSource, clazz);
  };
}
