import { ContextProto } from '@eggjs/tegg';
import { ContextHello } from '../decorator/ContextHello.js';
import { ContextHelloType } from '../FooType.js';
import { AbstractContextHello } from '../AbstractContextHello.js';

@ContextProto()
@ContextHello(ContextHelloType.FOO)
export class FooContextHello extends AbstractContextHello {
  id = 0;

  hello(): string {
    return `hello, foo(context:${this.id++})`;
  }
}
