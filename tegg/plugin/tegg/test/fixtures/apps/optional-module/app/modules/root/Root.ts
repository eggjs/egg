import { SingletonProto, Inject } from '@eggjs/tegg';
import { UsedProto } from 'used/Used';

@SingletonProto()
export class RootProto {
  @Inject() usedProto: UsedProto;
}
