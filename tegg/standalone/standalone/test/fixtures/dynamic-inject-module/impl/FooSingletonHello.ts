import { SingletonProto } from '@eggjs/tegg';
import { SingletonHelloType } from '../FooType.js';
import { SingletonHello } from '../decorator/SingletonHello.js';
import { AbstractContextHello } from '../AbstractContextHello.js';

@SingletonProto()
@SingletonHello(SingletonHelloType.FOO)
export class FooSingletonHello extends AbstractContextHello {
  id = 0;

  hello(): string {
    return `hello, foo(singleton:${this.id++})`;
  }
}
