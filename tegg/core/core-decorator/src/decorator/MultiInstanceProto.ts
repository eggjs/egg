import { ObjectInitType, AccessLevel, DEFAULT_PROTO_IMPL_TYPE } from '@eggjs/tegg-types';
import type {
  EggMultiInstanceCallbackPrototypeInfo,
  EggMultiInstancePrototypeInfo,
  EggProtoImplClass,
  MultiInstancePrototypeParams,
  MultiInstancePrototypeStaticParams,
  MultiInstancePrototypeCallbackParams,
} from '@eggjs/tegg-types';
import { StackUtil } from '@eggjs/tegg-common-util';

import { PrototypeUtil } from '../util/index.ts';

const DEFAULT_PARAMS = {
  initType: ObjectInitType.SINGLETON,
  accessLevel: AccessLevel.PRIVATE,
  protoImplType: DEFAULT_PROTO_IMPL_TYPE,
};

export function MultiInstanceProto(param: MultiInstancePrototypeParams) {
  return function (clazz: EggProtoImplClass) {
    PrototypeUtil.setIsEggMultiInstancePrototype(clazz);
    if ((param as MultiInstancePrototypeStaticParams).objects) {
      const property: EggMultiInstancePrototypeInfo = {
        ...DEFAULT_PARAMS,
        ...(param as MultiInstancePrototypeStaticParams),
        className: clazz.name,
      };
      PrototypeUtil.setMultiInstanceStaticProperty(clazz, property);
    } else if ((param as MultiInstancePrototypeCallbackParams).getObjects) {
      const property: EggMultiInstanceCallbackPrototypeInfo = {
        ...DEFAULT_PARAMS,
        ...(param as MultiInstancePrototypeCallbackParams),
        className: clazz.name,
      };
      PrototypeUtil.setMultiInstanceCallbackProperty(clazz, property);
    }

    // './tegg/core/common-util/src/StackUtil.ts',
    // './tegg/core/core-decorator/src/decorator/Prototype.ts',
    // './tegg/core/core-decorator/node_modules/_reflect-metadata@0.1.13@reflect-metadata/Reflect.js',
    // './tegg/core/core-decorator/node_modules/_reflect-metadata@0.1.13@reflect-metadata/Reflect.js',
    // './tegg/core/core-decorator/test/fixtures/decators/CacheService.ts',
    PrototypeUtil.setFilePath(clazz, StackUtil.getCalleeFromStack(false, 4));
  };
}
