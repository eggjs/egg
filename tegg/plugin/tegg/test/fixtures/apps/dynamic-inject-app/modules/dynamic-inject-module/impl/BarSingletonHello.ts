import { SingletonProto } from '@eggjs/tegg';

import { AbstractContextHello } from '../AbstractContextHello.ts';
import { SingletonHello } from '../decorator/SingletonHello.ts';
import { SingletonHelloType } from '../FooType.ts';

@SingletonProto()
@SingletonHello(SingletonHelloType.BAR)
export class BarSingletonHello extends AbstractContextHello {
  id = 0;

  hello(): string {
    return `hello, bar(singleton:${this.id++})`;
  }
}
