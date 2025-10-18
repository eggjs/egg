import { AccessLevel, SingletonProto, Inject } from '@eggjs/tegg';
import BarService from './BarService.js';

@SingletonProto({
  accessLevel: AccessLevel.PRIVATE,
})
export default class FooService {
  @Inject()
  barService: BarService;

  public moduleMainFooServiceMethod() {
    return 'moduleMain-FooService-Method';
  }

  public moduleMainFooServiceInvokeBar() {
    return this.barService.moduleMainBarServiceMethod();
  }
}
