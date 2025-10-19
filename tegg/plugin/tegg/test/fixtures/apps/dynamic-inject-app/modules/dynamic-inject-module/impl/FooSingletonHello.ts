import { SingletonProto } from '@eggjs/tegg';
import { SingletonHelloType } from '../FooType.ts';
import { SingletonHello } from '../decorator/SingletonHello.ts';
import { AbstractContextHello } from '../AbstractContextHello.ts';

@SingletonProto()
@SingletonHello(SingletonHelloType.FOO)
export class FooSingletonHello extends AbstractContextHello {
  id = 0;

  hello(): string {
    return `hello, foo(singleton:${this.id++})`;
  }
}
