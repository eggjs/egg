import { Prototype, PrototypeUtil } from '@eggjs/core-decorator';
import { StackUtil } from '@eggjs/tegg-common-util';
import type { EggProtoImplClass, TableParams } from '@eggjs/tegg-types';
import { AccessLevel, ObjectInitType } from '@eggjs/tegg-types';

import { TableInfoUtil } from '../util/index.ts';

export function Table(params?: TableParams) {
  return function (constructor: EggProtoImplClass): void {
    TableInfoUtil.setIsTable(constructor);
    if (params) {
      TableInfoUtil.setTableParams(constructor, params);
    }
    const func = Prototype({
      accessLevel: AccessLevel.PUBLIC,
      initType: ObjectInitType.ALWAYS_NEW,
    });
    func(constructor);
    PrototypeUtil.setFilePath(constructor, StackUtil.getCalleeFromStack(false, 5));
  };
}
