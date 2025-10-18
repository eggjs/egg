import { Inject, SingletonProto } from '@eggjs/tegg';
import { FooService } from '../module-foo/FooService.js';

@SingletonProto()
export class BarConstructorService1 {
  constructor(@Inject() readonly fooService: FooService) {}

  type() {
    return this.fooService.type;
  }
}
