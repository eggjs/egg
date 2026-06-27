import { AccessLevel, SingletonProto } from '@eggjs/tegg';
import { EggObjectFactory } from '@eggjs/tegg-dynamic-inject-runtime';
import {
  EGG_OBJECT_FACTORY_PROTO_IMPLE_TYPE,
} from '@eggjs/tegg-dynamic-inject-runtime/src/EggObjectFactoryPrototype';

@SingletonProto({
  protoImplType: EGG_OBJECT_FACTORY_PROTO_IMPLE_TYPE,
  accessLevel: AccessLevel.PRIVATE,
})
export class StandaloneEggObjectFactory extends EggObjectFactory {}
