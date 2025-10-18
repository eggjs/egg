import { AccessLevel, SingletonProto, Inject } from '@eggjs/tegg';
import BarService from './BarService.js';
import FooService from './FooService.js';

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export default class MainService {
  @Inject()
  fooService: FooService;

  @Inject()
  barService: BarService;

  public invokeFoo() {
    return this.fooService.moduleMainFooServiceMethod();
  }

  public invokeBar() {
    return this.barService.moduleMainBarServiceMethod();
  }
}
