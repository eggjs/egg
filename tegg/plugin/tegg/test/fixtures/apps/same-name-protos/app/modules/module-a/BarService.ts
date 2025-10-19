import { SingletonProto, Inject, ModuleQualifier } from '@eggjs/tegg';

import { FooService } from '../module-foo/FooService.ts';

@SingletonProto()
export class BarService {
  @Inject()
  @ModuleQualifier('foo')
  fooService: FooService;

  bar(): void {
    console.log(this.fooService);
  }
}
