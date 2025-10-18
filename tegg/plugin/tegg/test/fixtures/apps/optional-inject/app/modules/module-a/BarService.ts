import { SingletonProto, Inject, InjectOptional } from '@eggjs/tegg';

@SingletonProto()
export class BarService {
  @Inject({ optional: true })
  doesNotExist1?: object;

  @InjectOptional()
  doesNotExist2?: object;

  bar() {
    return {
      nil1: this.doesNotExist1 ? 'N' : 'Y',
      nil2: this.doesNotExist2 ? 'N' : 'Y',
    };
  }
}
