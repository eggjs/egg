import { EGG_OBJECT_FACTORY_PROTO_IMPLE_TYPE, EggObjectFactory } from '@eggjs/dynamic-inject-runtime';
import { AccessLevel, SingletonProto } from '@eggjs/tegg';

// Match the injection name used by runtime consumers.
@SingletonProto({
  protoImplType: EGG_OBJECT_FACTORY_PROTO_IMPLE_TYPE,
  name: 'eggObjectFactory',
  accessLevel: AccessLevel.PRIVATE,
})
export class StandaloneEggObjectFactory extends EggObjectFactory {}
