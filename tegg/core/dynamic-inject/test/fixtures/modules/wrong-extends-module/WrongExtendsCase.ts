import { ContextProto } from '@eggjs/core-decorator';
import { ContextHello } from '../base/ContextHello.js';
import { ContextHelloType } from '../base/FooType.js';

@ContextProto()
@ContextHello(ContextHelloType.FOO)
export class BarContextHello {
  id = 0;

  helloWrong(): string {
    return `hello, bar(context:${this.id++})`;
  }
}
