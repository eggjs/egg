import { SingletonProto } from '@eggjs/tegg';

import { AbstractContextHello } from '../AbstractContextHello.ts';
import { SingletonHello } from '../decorator/SingletonHello.ts';
import { SingletonHelloType } from '../FooType.ts';

@SingletonProto()
@SingletonHello(SingletonHelloType.FOO)
export class FooSingletonHello extends AbstractContextHello {
  id = 0;

  hello(): string {
    return `hello, foo(singleton:${this.id++})`;
  }
}
