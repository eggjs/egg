import { EGG_OBJECT_FACTORY_PROTO_IMPLE_TYPE, EggObjectFactory } from '@eggjs/dynamic-inject-runtime';
import { AccessLevel, SingletonProto } from '@eggjs/tegg';

// name pins to `eggObjectFactory` so injects resolve it locally, not via the
// module-scan-order-sensitive global proto in @eggjs/dynamic-inject-runtime.
@SingletonProto({
  protoImplType: EGG_OBJECT_FACTORY_PROTO_IMPLE_TYPE,
  name: 'eggObjectFactory',
  accessLevel: AccessLevel.PRIVATE,
})
export class StandaloneEggObjectFactory extends EggObjectFactory {}
