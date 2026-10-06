import { EGG_INNER_OBJECT_PROTO_IMPL_TYPE } from '@eggjs/tegg-types';
import type { EggProtoImplClass, InnerObjectProtoParams } from '@eggjs/tegg-types';

import { PrototypeUtil } from '../util/PrototypeUtil.ts';
import type { PrototypeDecorator } from './Prototype.ts';
import { SingletonProto } from './SingletonProto.ts';

export function InnerObjectProto(params?: InnerObjectProtoParams): PrototypeDecorator {
  return function (clazz: EggProtoImplClass) {
    const protoParams = {
      protoImplType: EGG_INNER_OBJECT_PROTO_IMPL_TYPE,
      ...params,
    };
    SingletonProto(protoParams)(clazz);
    PrototypeUtil.setIsEggInnerObject(clazz);
  };
}
