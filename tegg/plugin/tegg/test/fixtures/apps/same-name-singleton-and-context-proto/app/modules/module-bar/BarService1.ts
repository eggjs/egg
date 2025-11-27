import { Inject, SingletonProto } from '@eggjs/tegg';

import { FooService } from '../module-foo/FooService.js';

@SingletonProto()
export class BarService1 {
  @Inject()
  fooService: FooService;

  type(): string {
    return this.fooService.type;
  }
}
