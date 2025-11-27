import { ContextProto } from '@eggjs/core-decorator';

import { AbstractContextHello } from '../AbstractContextHello.js';
import { ContextHello } from '../decorator/ContextHello.js';
import { ContextHelloType } from '../FooType.js';

@ContextProto()
@ContextHello(ContextHelloType.FOO)
export class FooContextHello extends AbstractContextHello {
  id = 0;

  hello(): string {
    return `hello, foo(context:${this.id++})`;
  }
}
