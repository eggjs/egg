import { SingletonProto, Inject } from '@eggjs/tegg';

@SingletonProto()
export class BarService {
  @Inject()
  doesNotExist: object;

  bar(): void {
    console.log(this.doesNotExist);
  }
}
