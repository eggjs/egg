import { SingletonProto } from '@eggjs/core-decorator';
import { AccessLevel, MODEL_PROTO_IMPL_TYPE } from '@eggjs/tegg-types';
import type { EggProtoImplClass, ModelParams } from '@eggjs/tegg-types';

import { ModelInfoUtil } from '../util/index.ts';

export function Model(param?: ModelParams) {
  return function (clazz: EggProtoImplClass) {
    ModelInfoUtil.setIsModel(true, clazz);
    const func = SingletonProto({
      name: clazz.name,
      accessLevel: AccessLevel.PUBLIC,
      protoImplType: MODEL_PROTO_IMPL_TYPE,
    });
    if (param?.tableName) {
      ModelInfoUtil.setTableName(param.tableName, clazz);
    }
    if (param?.dataSource) {
      ModelInfoUtil.setDataSource(param.dataSource, clazz);
    }
    func(clazz);
  };
}
