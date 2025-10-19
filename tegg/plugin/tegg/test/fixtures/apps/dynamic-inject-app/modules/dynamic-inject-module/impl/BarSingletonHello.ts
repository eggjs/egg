import { SingletonProto } from '@eggjs/tegg';
import { SingletonHelloType } from '../FooType.ts';
import { SingletonHello } from '../decorator/SingletonHello.ts';
import { AbstractContextHello } from '../AbstractContextHello.ts';

@SingletonProto()
@SingletonHello(SingletonHelloType.BAR)
export class BarSingletonHello extends AbstractContextHello {
  id = 0;

  hello(): string {
    return `hello, bar(singleton:${this.id++})`;
  }
}
