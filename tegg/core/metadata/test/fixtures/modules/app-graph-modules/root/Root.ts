import { SingletonProto, Inject } from '@eggjs/core-decorator';
import { UsedProto } from '../used/Used.ts';

@SingletonProto()
export class RootProto {
  @Inject() usedProto: UsedProto;
}
