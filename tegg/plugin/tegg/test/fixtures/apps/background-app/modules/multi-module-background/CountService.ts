import { SingletonProto } from '@eggjs/tegg';

@SingletonProto()
export class CountService {
  count = 0;
  foo: string;
  constructor(foo: string) {
    this.foo = foo;
  }
}
