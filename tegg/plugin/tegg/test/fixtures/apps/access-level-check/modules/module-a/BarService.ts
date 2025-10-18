import { AccessLevel, SingletonProto } from '@eggjs/tegg';

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export default class BarService {
  public moduleABarServiceMethod() {
    return 'moduleA-BarService-Method';
  }
}
