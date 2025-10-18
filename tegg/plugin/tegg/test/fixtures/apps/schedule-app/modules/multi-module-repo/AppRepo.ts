import { AccessLevel, SingletonProto } from '@eggjs/tegg';

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export default class AppRepo {
  public async findApp(): Promise<Record<string, any>> {
    return {};
  }
}
