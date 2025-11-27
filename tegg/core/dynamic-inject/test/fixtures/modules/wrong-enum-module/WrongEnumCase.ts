import { ContextProto } from '@eggjs/core-decorator';

import { AbstractContextHello } from '../base/AbstractContextHello.js';
import { ContextHello } from '../base/ContextHello.js';

@ContextProto()
@ContextHello('WRONG_ENUM')
export class BarContextHello extends AbstractContextHello {
  id = 0;

  hello(): string {
    return `hello, bar(context:${this.id++})`;
  }
}
