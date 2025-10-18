import { Inject, SingletonProto } from '@eggjs/tegg';
import { FooService } from './FooService.js';

@SingletonProto()
export class BarConstructorService2 {
  constructor(@Inject() readonly fooService: FooService) {}

  type() {
    return this.fooService.type;
  }
}
