import type { EggProtoImplClass, IndexParams } from '@eggjs/tegg-types';

import { IndexInfoUtil } from '../util/index.ts';

export function Index(params: IndexParams) {
  return function (constructor: EggProtoImplClass) {
    IndexInfoUtil.addIndex(constructor, params);
  };
}
