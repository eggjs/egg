import { AccessLevel, SingletonProto } from '@eggjs/tegg';

@SingletonProto({
  accessLevel: AccessLevel.PRIVATE,
})
export default class BarService {
  public moduleMainBarServiceMethod() {
    return 'moduleMain-BarService-Method';
  }
}
