import { ContextProto } from '@eggjs/tegg';

import { AbstractContextHello } from '../AbstractContextHello.ts';
import { ContextHello } from '../decorator/ContextHello.ts';
import { ContextHelloType } from '../FooType.ts';

@ContextProto()
@ContextHello(ContextHelloType.FOO)
export class FooContextHello extends AbstractContextHello {
  id = 0;

  hello(): string {
    return `hello, foo(context:${this.id++})`;
  }
}
