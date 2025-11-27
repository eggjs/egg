import { SingletonProto } from '@eggjs/core-decorator';

import { AbstractContextHello } from '../AbstractContextHello.js';
import { SingletonHello } from '../decorator/SingletonHello.js';
import { SingletonHelloType } from '../FooType.js';

@SingletonProto()
@SingletonHello(SingletonHelloType.FOO)
export class FooSingletonHello extends AbstractContextHello {
  id = 0;

  hello(): string {
    return `hello, foo(singleton:${this.id++})`;
  }
}
