import { Inject, SingletonProto } from '@eggjs/tegg';
import { FooService } from './FooService.js';

@SingletonProto()
export class BarConstructorService2 {
  constructor(
    // @ts-expect-error readonly property in constructor
    @Inject() readonly fooService: FooService,
  ) {}

  type(): string {
    return this.fooService.type;
  }
}
