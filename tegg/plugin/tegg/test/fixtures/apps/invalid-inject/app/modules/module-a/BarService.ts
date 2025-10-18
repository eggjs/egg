import { SingletonProto, Inject } from '@eggjs/tegg';

@SingletonProto()
export class BarService {
  @Inject()
  doesNotExist: object;

  bar() {
    console.log(this.doesNotExist);
  }
}
