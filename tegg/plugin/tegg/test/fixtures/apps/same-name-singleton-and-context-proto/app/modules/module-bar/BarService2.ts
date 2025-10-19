import { Inject, SingletonProto } from '@eggjs/tegg';
import { FooService } from './FooService.js';

@SingletonProto()
export class BarService2 {
  @Inject()
  fooService: FooService;

  type(): string {
    return this.fooService.type;
  }
}
