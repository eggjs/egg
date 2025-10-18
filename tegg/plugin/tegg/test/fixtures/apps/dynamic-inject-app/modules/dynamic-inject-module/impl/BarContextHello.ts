import { ContextProto } from '@eggjs/tegg';
import { ContextHello } from '../decorator/ContextHello.ts';
import { ContextHelloType } from '../FooType.ts';
import { AbstractContextHello } from '../AbstractContextHello.ts';

@ContextProto()
@ContextHello(ContextHelloType.BAR)
export class BarContextHello extends AbstractContextHello {
  id = 0;

  hello(): string {
    return `hello, bar(context:${this.id++})`;
  }
}
