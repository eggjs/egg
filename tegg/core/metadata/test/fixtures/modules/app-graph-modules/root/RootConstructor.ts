import { SingletonProto, Inject } from '@eggjs/core-decorator';

import { UsedProto } from '../used/Used.ts';

@SingletonProto()
export class RootConstructorProto {
  // @ts-expect-error readonly property in constructor
  constructor(@Inject() readonly usedProto: UsedProto) {}
}
