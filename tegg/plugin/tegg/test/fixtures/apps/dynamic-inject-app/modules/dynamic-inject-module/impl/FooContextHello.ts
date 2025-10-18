import { ContextProto } from '@eggjs/tegg';
import { ContextHello } from '../decorator/ContextHello.ts';
import { ContextHelloType } from '../FooType.ts';
import { AbstractContextHello } from '../AbstractContextHello.ts';

@ContextProto()
@ContextHello(ContextHelloType.FOO)
export class FooContextHello extends AbstractContextHello {
  id = 0;

  hello(): string {
    return `hello, foo(context:${this.id++})`;
  }
}
