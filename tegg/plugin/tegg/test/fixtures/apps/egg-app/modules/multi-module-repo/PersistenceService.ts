import { AccessLevel, SingletonProto } from '@eggjs/tegg';

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export default class PersistenceService {
  private store: Map<string, string> = new Map();

  public set(key: string, val: string) {
    this.store.set(key, val);
  }

  public get(key: string): string | undefined {
    return this.store.get(key);
  }
}
