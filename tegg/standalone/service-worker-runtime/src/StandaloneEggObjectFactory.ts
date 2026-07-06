import { EGG_OBJECT_FACTORY_PROTO_IMPLE_TYPE, EggObjectFactory } from '@eggjs/dynamic-inject-runtime';
import { AccessLevel, SingletonProto } from '@eggjs/tegg';

@SingletonProto({
  protoImplType: EGG_OBJECT_FACTORY_PROTO_IMPLE_TYPE,
  accessLevel: AccessLevel.PRIVATE,
})
export class StandaloneEggObjectFactory extends EggObjectFactory {}
